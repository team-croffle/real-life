import { randomInt } from 'node:crypto';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { and, eq } from 'drizzle-orm';
import { createTransport } from 'nodemailer';

import type { DrizzleDb } from '../database/database.module';
import { accounts, sessions, users, verifications } from '../database/schema';

const TAG_ATTEMPTS = 8;

export type AuthConfig = {
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  webOrigin: string;
  googleClientId: string;
  googleClientSecret: string;
  smtpUser: string;
  smtpPass: string;
  smtpHost: string;
  smtpPort: string;
  mailFrom: string;
};

function sanitizeNickname(value: string): string {
  const nickname = value.replaceAll('#', '').slice(0, 20).trim();
  return nickname.length > 0 ? nickname : 'user';
}

async function verifyGoogleLinkedEmail(db: DrizzleDb, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [userRow] = await tx
      .select({ emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!userRow || userRow.emailVerified) {
      return;
    }

    const [googleAccount] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.providerId, 'google')))
      .limit(1);
    if (!googleAccount) {
      return;
    }

    await tx
      .update(accounts)
      .set({ password: null })
      .where(and(eq(accounts.userId, userId), eq(accounts.providerId, 'credential')));
    await tx.update(users).set({ emailVerified: true }).where(eq(users.id, userId));
  });
}

export async function allocateTag(db: DrizzleDb, nickname: string): Promise<string> {
  // Tags must be tried one by one after a unique conflict.
  /* oxlint-disable no-await-in-loop */
  for (let attempt = 0; attempt < TAG_ATTEMPTS; attempt += 1) {
    const tag = String(randomInt(0, 10_000)).padStart(4, '0');
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.nickname, nickname), eq(users.tag, tag)))
      .limit(1);
    if (!existing) {
      return tag;
    }
  }
  /* oxlint-enable no-await-in-loop */
  throw new Error('Could not allocate nickname tag');
}

async function sendMail(config: AuthConfig, to: string, verifyUrl: string): Promise<void> {
  if (!config.smtpUser || !config.smtpPass) {
    throw new Error('Email sending is not configured');
  }

  const port = Number(config.smtpPort || '587');
  const transport = createTransport({
    host: config.smtpHost || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });

  await transport.sendMail({
    from: config.mailFrom || config.smtpUser,
    to,
    subject: '이메일 인증',
    text: `아래 링크를 열어 가입을 완료하세요.\n${verifyUrl}`,
    html: `<p>아래 링크를 열어 가입을 완료하세요.</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });
}

export function createAuth(db: DrizzleDb, config: AuthConfig) {
  const googleEnabled = Boolean(config.googleClientId);

  return betterAuth({
    baseURL: config.baseURL,
    basePath: '/api/auth',
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    disabledPaths: ['/sign-up/email', '/sign-up/social'],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        // 키는 모델 이름과 같아야 어댑터가 테이블을 찾는다. user 모델은 modelName이 `users`다.
        users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    advanced: {
      database: {
        // uuid면 라이브러리가 id를 만들지 않고 DB 기본값에 맡긴다.
        generateId: 'uuid',
      },
    },
    user: {
      modelName: 'users',
      additionalFields: {
        nickname: {
          type: 'string',
          required: true,
          input: true,
        },
        tag: {
          // 가입 요청에는 태그가 없다. required면 라이브러리가 훅보다 먼저 거절한다.
          type: 'string',
          required: false,
          input: false,
        },
        jobClass: {
          type: 'string',
          required: false,
          input: false,
        },
        role: {
          type: 'string',
          required: false,
          defaultValue: 'member',
          input: false,
        },
      },
      deleteUser: {
        // 탈퇴는 Nest `DELETE /account/me`가 확인과 삭제를 모두 한다.
        enabled: false,
      },
      changeEmail: {
        enabled: false,
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, token }) => {
        const verifyUrl = `${config.webOrigin.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
        await sendMail(config, user.email, verifyUrl);
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: googleEnabled ? ['google'] : [],
      },
    },
    socialProviders: googleEnabled
      ? {
          google: {
            clientId: config.googleClientId,
            clientSecret: config.googleClientSecret,
            mapProfileToUser: (profile) => ({
              name: sanitizeNickname(String(profile.given_name ?? profile.name ?? 'user')),
              nickname: sanitizeNickname(String(profile.given_name ?? profile.name ?? 'user')),
            }),
          },
        }
      : {},
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const raw = String((user as { nickname?: string }).nickname ?? user.name ?? '')
              .replaceAll('#', '')
              .slice(0, 20)
              .trim();
            if (!raw) {
              throw new APIError('BAD_REQUEST', { message: 'Nickname required' });
            }
            const nickname = raw;
            return {
              data: {
                ...user,
                name: nickname,
                nickname,
                tag: await allocateTag(db, nickname),
                role: 'member',
                jobClass: null,
              },
            };
          },
        },
      },
      account: {
        create: {
          after: async (account) => {
            if (account.providerId !== 'google') {
              return;
            }
            await verifyGoogleLinkedEmail(db, account.userId);
          },
        },
      },
      session: {
        create: {
          after: async (session) => {
            await verifyGoogleLinkedEmail(db, session.userId);
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
