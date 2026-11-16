import { randomInt } from 'node:crypto';

import { accountSuspendedBody, API_PREFIX, isAccountSuspended } from '@nest-vue/shared';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { and, eq } from 'drizzle-orm';

import type { DrizzleDb } from '../database/database.module';
import { accounts, sessions, users, verifications } from '../database/schema';

export const EMAIL_VERIFICATION_EXPIRES_IN = 60 * 60 * 24;
const EMAIL_VERIFICATION_EXPIRES_HOURS = EMAIL_VERIFICATION_EXPIRES_IN / (60 * 60);
const MAIL_FROM_DEFAULT = 'RealLife <onboarding@resend.dev>';
const RESEND_REQUEST_TIMEOUT_MS = 10_000;
const VERIFY_BUTTON_BACKGROUND = '#2a7561';
const VERIFY_BUTTON_COLOR = '#ffffff';

export const TAG_ATTEMPTS = 8;
export const NICKNAME_TAG_UNIQUE = 'users_nickname_tag_unique';

export function isNicknameTagUniqueViolation(error: unknown): boolean {
  return constraintNames(error).includes(NICKNAME_TAG_UNIQUE);
}

function constraintNames(error: unknown): string[] {
  const names: string[] = [];
  const visit = (value: unknown, depth: number): void => {
    if (depth > 6 || value === null || value === undefined) {
      return;
    }
    if (typeof value === 'string') {
      if (value.includes(NICKNAME_TAG_UNIQUE)) {
        names.push(NICKNAME_TAG_UNIQUE);
      }
      return;
    }
    if (typeof value !== 'object') {
      return;
    }
    const record = value as {
      code?: unknown;
      constraint?: unknown;
      cause?: unknown;
      message?: unknown;
    };
    if (record.constraint === NICKNAME_TAG_UNIQUE) {
      names.push(NICKNAME_TAG_UNIQUE);
    }
    if (typeof record.message === 'string') {
      visit(record.message, depth + 1);
    }
    visit(record.cause, depth + 1);
  };
  visit(error, 0);
  return names;
}

export type AuthConfig = {
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  webOrigin: string;
  googleClientId: string;
  googleClientSecret: string;
  resendApiKey: string;
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
  if (!config.resendApiKey) {
    throw new Error('Email sending is not configured');
  }

  const subject = '[RealLife] 이메일 인증을 완료해 주세요';
  const text = [
    'RealLife에 가입해 주셔서 고마워요.',
    '아래 버튼을 눌러 이메일 인증을 마치면 바로 시작할 수 있어요.',
    '',
    verifyUrl,
    '',
    `링크는 ${EMAIL_VERIFICATION_EXPIRES_HOURS}시간 동안 쓸 수 있어요.`,
    '가입한 적이 없다면 이 메일은 무시해도 괜찮아요.',
  ].join('\n');
  const html = [
    '<p>RealLife에 가입해 주셔서 고마워요.</p>',
    '<p>아래 버튼을 눌러 이메일 인증을 마치면 바로 시작할 수 있어요.</p>',
    `<p><a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background:${VERIFY_BUTTON_BACKGROUND};color:${VERIFY_BUTTON_COLOR};text-decoration:none;border-radius:8px;">이메일 인증하기</a></p>`,
    `<p>링크는 ${EMAIL_VERIFICATION_EXPIRES_HOURS}시간 동안 쓸 수 있어요.</p>`,
    '<p>가입한 적이 없다면 이 메일은 무시해도 괜찮아요.</p>',
  ].join('');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.mailFrom.trim() || MAIL_FROM_DEFAULT,
      to,
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(RESEND_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${detail}`);
  }
}

export function createAuth(db: DrizzleDb, config: AuthConfig) {
  const googleEnabled = Boolean(config.googleClientId);

  return betterAuth({
    baseURL: config.baseURL,
    basePath: `/${API_PREFIX}/auth`,
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
        suspended: {
          type: 'boolean',
          required: false,
          defaultValue: false,
          input: false,
        },
        suspendedUntil: {
          type: 'date',
          required: false,
          input: false,
        },
        suspendReason: {
          type: 'string',
          required: false,
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
      expiresIn: EMAIL_VERIFICATION_EXPIRES_IN,
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
          before: async (session) => {
            const [userRow] = await db
              .select({
                suspended: users.suspended,
                suspendedUntil: users.suspendedUntil,
                suspendReason: users.suspendReason,
              })
              .from(users)
              .where(eq(users.id, session.userId))
              .limit(1);
            if (!userRow || !isAccountSuspended(userRow)) {
              return;
            }
            throw new APIError('FORBIDDEN', accountSuspendedBody(userRow));
          },
          after: async (session) => {
            await verifyGoogleLinkedEmail(db, session.userId);
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
