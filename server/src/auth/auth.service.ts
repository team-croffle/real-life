import { createHash, randomBytes, randomInt } from 'node:crypto';

import type {
  AuthProvider,
  GoogleAuthResult,
  JobClass,
  LoginResult,
  RegisterResult,
  User,
} from '@nest-vue/shared';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { OAuth2Client } from 'google-auth-library';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import {
  type UserRow,
  authIdentities,
  emailVerificationTokens,
  refreshTokens,
  users,
} from '../database/schema';
import {
  ACCESS_TOKEN_EXPIRES,
  ACCESS_TOKEN_TYPE,
  EMAIL_VERIFY_EXPIRES,
  ONBOARDING_TOKEN_EXPIRES,
  ONBOARDING_TOKEN_TYPE,
  REFRESH_TOKEN_EXPIRES,
  REFRESH_TOKEN_TYPE,
} from './auth.constants';
import type { OnboardingTokenPayload, RefreshTokenPayload } from './auth.types';
import { MailService } from './mail.service';

const PASSWORD_ROUNDS = 10;
const TAG_ATTEMPTS = 8;
/** Timing stand-in when the email has no password hash. Not a real password. */
const LOGIN_DUMMY_HASH = '$2b$10$RiHRXK6k3eGFXqNTcdTS3u1c9GKdivoXfvoOvLw5soiVBN7khZXQu';

type AuthDb = Pick<DrizzleDb, 'insert' | 'update' | 'select' | 'delete'>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    nickname: string;
    jobClass: JobClass;
  }): Promise<RegisterResult> {
    if (
      this.config.get<string>('NODE_ENV') === 'production' &&
      (!this.config.get<string>('SMTP_USER') || !this.config.get<string>('SMTP_PASS'))
    ) {
      throw new ServiceUnavailableException('Email sending is not configured');
    }

    const email = input.email.toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) {
      await hash(input.password, PASSWORD_ROUNDS);
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await hash(input.password, PASSWORD_ROUNDS);
    const row = await this.insertUser({
      email,
      passwordHash,
      nickname: input.nickname,
      jobClass: input.jobClass,
    });

    const { token, mailed } = await this.sendVerificationEmail(row);
    return {
      email: row.email,
      needsEmailVerification: true,
      ...(mailed === 'dev-token' ? { devVerifyToken: token } : {}),
    };
  }

  async verifyEmail(token: string): Promise<LoginResult> {
    const tokenHash = hashToken(token);
    const now = new Date();

    const result = await this.db.transaction(async (tx) => {
      const [consumed] = await tx
        .delete(emailVerificationTokens)
        .where(
          and(
            eq(emailVerificationTokens.tokenHash, tokenHash),
            gt(emailVerificationTokens.expiresAt, now),
          ),
        )
        .returning({ userId: emailVerificationTokens.userId });

      if (!consumed) {
        return { ok: false as const };
      }

      const user = await this.markEmailVerified(consumed.userId, false, tx);
      return { ok: true as const, login: await this.issueLogin(user, tx) };
    });

    if (!result.ok) {
      throw new UnauthorizedException();
    }

    return result.login;
  }

  async resendVerification(email: string): Promise<void> {
    const row = await this.findByEmail(email.toLowerCase());
    if (!row?.passwordHash || row.emailVerifiedAt) {
      return;
    }
    const { mailed } = await this.sendVerificationEmail(row);
    if (mailed === 'queued') {
      throw new ServiceUnavailableException('Email sending failed');
    }
  }

  async login(input: { email: string; password: string }): Promise<LoginResult> {
    const row = await this.findByEmail(input.email.toLowerCase());
    const passwordHash = row?.passwordHash ?? LOGIN_DUMMY_HASH;
    const matches = await compare(input.password, passwordHash);
    if (!row?.passwordHash || !matches) {
      throw new UnauthorizedException();
    }

    return this.issueLogin(row);
  }

  async refresh(refreshToken: string): Promise<LoginResult> {
    const payload = await this.verifyRefresh(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const result = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .limit(1);

      if (!row || row.revokedAt || row.expiresAt <= new Date() || row.userId !== payload.sub) {
        await this.revokeAllRefreshTokens(payload.sub, tx);
        return { ok: false as const };
      }

      const [revoked] = await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.id, row.id), isNull(refreshTokens.revokedAt)))
        .returning({ id: refreshTokens.id });

      if (!revoked) {
        return { ok: false as const };
      }

      const user = await this.getUserRow(payload.sub, tx);
      return { ok: true as const, login: await this.issueLogin(user, tx) };
    });

    if (!result.ok) {
      throw new UnauthorizedException();
    }

    return result.login;
  }

  /** Revokes this refresh row. Access JWTs whose sid points at it fail the guard. */
  async logout(refreshToken: string): Promise<void> {
    const payload = await this.verifyRefresh(refreshToken);
    const tokenHash = hashToken(refreshToken);
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!row || row.userId !== payload.sub) {
      throw new UnauthorizedException();
    }

    if (!row.revokedAt) {
      await this.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.id, row.id));
    }
  }

  async me(userId: string): Promise<User> {
    return toUser(await this.getUserRow(userId));
  }

  async withdraw(
    userId: string,
    input: { confirm: true; password?: string; idToken?: string },
  ): Promise<void> {
    const row = await this.getUserRow(userId);

    if (row.passwordHash) {
      if (!input.password || !(await compare(input.password, row.passwordHash))) {
        throw new UnauthorizedException();
      }
    } else {
      const google = await this.findIdentity(userId, 'google');
      if (!google || !input.idToken) {
        throw new UnauthorizedException();
      }
      const profile = await this.verifyGoogleIdToken(input.idToken);
      if (profile.sub !== google.subject) {
        throw new UnauthorizedException();
      }
    }

    await this.db.delete(users).where(eq(users.id, userId));
  }

  async google(idToken: string): Promise<GoogleAuthResult> {
    const profile = await this.verifyGoogleIdToken(idToken);
    const existing = await this.findUserByIdentity('google', profile.sub);
    if (existing) {
      const ready = existing.emailVerifiedAt
        ? existing
        : await this.markEmailVerified(existing.id, false);
      const login = await this.issueLogin(ready);
      return { needsOnboarding: false, ...login };
    }

    const byEmail = await this.findByEmail(profile.email);
    if (byEmail) {
      if (await this.findIdentity(byEmail.id, 'google')) {
        throw new ConflictException('Email already registered');
      }
      await this.linkIdentity(byEmail.id, 'google', profile.sub);
      const claimed = await this.markEmailVerified(byEmail.id, true);
      const login = await this.issueLogin(claimed);
      return { needsOnboarding: false, ...login };
    }

    const onboardingToken = await this.jwt.signAsync(
      {
        typ: ONBOARDING_TOKEN_TYPE,
        provider: 'google',
        subject: profile.sub,
        email: profile.email,
      } satisfies OnboardingTokenPayload,
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: ONBOARDING_TOKEN_EXPIRES,
      },
    );

    return { needsOnboarding: true, onboardingToken };
  }

  async googleOnboarding(input: {
    onboardingToken: string;
    nickname: string;
    jobClass: JobClass;
  }): Promise<LoginResult> {
    const payload = await this.verifyOnboarding(input.onboardingToken);
    if (await this.findUserByIdentity(payload.provider, payload.subject)) {
      throw new ConflictException('Google account already registered');
    }
    const existingEmail = await this.findByEmail(payload.email);
    if (existingEmail) {
      if (await this.findIdentity(existingEmail.id, payload.provider)) {
        throw new ConflictException('Email already registered');
      }
      await this.linkIdentity(existingEmail.id, payload.provider, payload.subject);
      const claimed = await this.markEmailVerified(existingEmail.id, true);
      return this.issueLogin(claimed);
    }

    const created = await this.insertUser({
      email: payload.email,
      nickname: input.nickname,
      jobClass: input.jobClass,
      emailVerifiedAt: new Date(),
    });
    try {
      await this.linkIdentity(created.id, payload.provider, payload.subject);
    } catch (error) {
      await this.db.delete(users).where(eq(users.id, created.id));
      throw error;
    }
    return this.issueLogin(created);
  }

  private async issueLogin(row: UserRow, db: AuthDb = this.db): Promise<LoginResult> {
    if (!row.emailVerifiedAt) {
      throw new ForbiddenException('Email not verified');
    }
    const accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');

    const refreshToken = await this.jwt.signAsync(
      { sub: row.id, typ: REFRESH_TOKEN_TYPE },
      { secret: refreshSecret, expiresIn: REFRESH_TOKEN_EXPIRES },
    );

    const [session] = await db
      .insert(refreshTokens)
      .values({
        userId: row.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: expiresAtFromTtl(REFRESH_TOKEN_EXPIRES),
      })
      .returning({ id: refreshTokens.id });

    const accessToken = await this.jwt.signAsync(
      { sub: row.id, typ: ACCESS_TOKEN_TYPE, sid: session!.id },
      { secret: accessSecret, expiresIn: ACCESS_TOKEN_EXPIRES },
    );

    return { accessToken, refreshToken, user: toUser(row) };
  }

  private async insertUser(
    input: {
      email: string;
      nickname: string;
      jobClass: JobClass;
      passwordHash?: string;
      emailVerifiedAt?: Date;
    },
    db: AuthDb = this.db,
  ): Promise<UserRow> {
    // Tags must be tried one by one after a unique conflict.
    /* oxlint-disable no-await-in-loop */
    for (let attempt = 0; attempt < TAG_ATTEMPTS; attempt += 1) {
      const tag = String(randomInt(0, 10_000)).padStart(4, '0');
      try {
        const [row] = await db
          .insert(users)
          .values({
            email: input.email,
            passwordHash: input.passwordHash,
            nickname: input.nickname,
            tag,
            jobClass: input.jobClass,
            emailVerifiedAt: input.emailVerifiedAt,
          })
          .returning();
        return row!;
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
        if (await this.findByEmail(input.email)) {
          throw new ConflictException('Email already registered');
        }
      }
    }

    /* oxlint-enable no-await-in-loop */
    throw new ConflictException('Could not allocate nickname tag');
  }

  private async markEmailVerified(
    userId: string,
    wipeUnverifiedPassword: boolean,
    db: AuthDb = this.db,
  ): Promise<UserRow> {
    const current = await this.getUserRow(userId, db);
    const [row] = await db
      .update(users)
      .set({
        emailVerifiedAt: new Date(),
        ...(wipeUnverifiedPassword && !current.emailVerifiedAt ? { passwordHash: null } : {}),
      })
      .where(eq(users.id, userId))
      .returning();
    if (!row) {
      throw new UnauthorizedException();
    }
    return row;
  }

  private async sendVerificationEmail(
    row: UserRow,
  ): Promise<{ token: string; mailed: 'sent' | 'dev-token' | 'queued' }> {
    await this.db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, row.id));
    const token = randomBytes(32).toString('base64url');
    await this.db.insert(emailVerificationTokens).values({
      userId: row.id,
      tokenHash: hashToken(token),
      expiresAt: expiresAtFromTtl(EMAIL_VERIFY_EXPIRES),
    });
    const web = (
      this.config.get<string>('WEB_ORIGIN') ??
      this.config.get<string>('CORS_ORIGIN', 'http://localhost:5173')
    ).replace(/\/$/, '');
    const verifyUrl = `${web}/verify-email?token=${encodeURIComponent(token)}`;
    try {
      const skipped = await this.mail.sendEmailVerification(row.email, verifyUrl);
      return { token, mailed: skipped ? 'dev-token' : 'sent' };
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Verification email send failed');
      return { token, mailed: 'queued' };
    }
  }

  private async linkIdentity(
    userId: string,
    provider: AuthProvider,
    subject: string,
    db: AuthDb = this.db,
  ): Promise<void> {
    try {
      await db.insert(authIdentities).values({ userId, provider, subject });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Social account already registered');
      }
      throw error;
    }
  }

  private async findIdentity(
    userId: string,
    provider: AuthProvider,
  ): Promise<{ subject: string } | undefined> {
    const [row] = await this.db
      .select({ subject: authIdentities.subject })
      .from(authIdentities)
      .where(and(eq(authIdentities.userId, userId), eq(authIdentities.provider, provider)))
      .limit(1);
    return row;
  }

  private async findUserByIdentity(
    provider: AuthProvider,
    subject: string,
  ): Promise<UserRow | undefined> {
    const [row] = await this.db
      .select({ user: users })
      .from(authIdentities)
      .innerJoin(users, eq(users.id, authIdentities.userId))
      .where(and(eq(authIdentities.provider, provider), eq(authIdentities.subject, subject)))
      .limit(1);
    return row?.user;
  }

  private async revokeAllRefreshTokens(userId: string, db: AuthDb = this.db): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  private async verifyRefresh(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      if (payload.typ !== REFRESH_TOKEN_TYPE || !payload.sub) {
        throw new UnauthorizedException();
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException();
    }
  }

  private async verifyOnboarding(token: string): Promise<OnboardingTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<OnboardingTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (
        payload.typ !== ONBOARDING_TOKEN_TYPE ||
        !payload.provider ||
        !payload.subject ||
        !payload.email
      ) {
        throw new UnauthorizedException();
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException();
    }
  }

  private async verifyGoogleIdToken(idToken: string): Promise<{ sub: string; email: string }> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new ServiceUnavailableException('Google login is not configured');
    }

    try {
      const ticket = await new OAuth2Client(clientId).verifyIdToken({
        idToken,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw new UnauthorizedException();
      }
      return { sub: payload.sub, email: payload.email.toLowerCase() };
    } catch (error) {
      if (error instanceof ServiceUnavailableException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException();
    }
  }

  private async getUserRow(id: string, db: AuthDb = this.db): Promise<UserRow> {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!row) {
      throw new UnauthorizedException();
    }
    return row;
  }

  private async findByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row;
  }
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    tag: row.tag,
    jobClass: row.jobClass,
    role: row.role,
    emailVerified: row.emailVerifiedAt !== null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function expiresAtFromTtl(ttl: string): Date {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) {
    throw new Error(`Invalid token TTL: ${ttl}`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const ms =
    unit === 's'
      ? amount * 1000
      : unit === 'm'
        ? amount * 60_000
        : unit === 'h'
          ? amount * 3_600_000
          : amount * 86_400_000;
  return new Date(Date.now() + ms);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}
