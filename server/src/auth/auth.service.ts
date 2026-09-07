import { createHash, randomInt } from 'node:crypto';

import type { JobClass, LoginResult, User } from '@nest-vue/shared';
import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { and, eq, isNull } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import { type UserRow, refreshTokens, users } from '../database/schema';
import {
  ACCESS_TOKEN_EXPIRES,
  ACCESS_TOKEN_TYPE,
  REFRESH_TOKEN_EXPIRES,
  REFRESH_TOKEN_TYPE,
} from './auth.constants';
import type { RefreshTokenPayload } from './auth.types';

const PASSWORD_ROUNDS = 10;
const TAG_ATTEMPTS = 8;
/** Timing stand-in when the email has no password hash. Not a real password. */
const LOGIN_DUMMY_HASH = '$2b$10$RiHRXK6k3eGFXqNTcdTS3u1c9GKdivoXfvoOvLw5soiVBN7khZXQu';

type AuthDb = Pick<DrizzleDb, 'insert' | 'update' | 'select' | 'delete'>;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    nickname: string;
    jobClass: JobClass;
  }): Promise<LoginResult> {
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
      emailVerifiedAt: new Date(),
    });

    return this.issueLogin(row);
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

  async withdraw(userId: string, input: { confirm: true; password?: string }): Promise<void> {
    const row = await this.getUserRow(userId);

    if (
      !input.password ||
      !row.passwordHash ||
      !(await compare(input.password, row.passwordHash))
    ) {
      throw new UnauthorizedException();
    }

    await this.db.delete(users).where(eq(users.id, userId));
  }

  private async issueLogin(row: UserRow, db: AuthDb = this.db): Promise<LoginResult> {
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
