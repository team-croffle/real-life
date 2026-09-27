import type { JobClass, RegisterResult, User } from '@nest-vue/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { APIError } from 'better-auth/api';
import { and, eq } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import { accounts, users } from '../database/schema';
import { allocateTag } from './auth';
import { toUser } from './to-user';

@Injectable()
export class ProfileService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    nickname: string;
  }): Promise<RegisterResult> {
    if (!this.config.get<string>('SMTP_USER') || !this.config.get<string>('SMTP_PASS')) {
      throw new ServiceUnavailableException('Email sending is not configured');
    }

    const email = input.email.toLowerCase();
    try {
      await this.auth.api.signUpEmail({
        body: {
          email,
          password: input.password,
          name: input.nickname,
          nickname: input.nickname,
        } as never,
      });
    } catch (error) {
      throw this.mapAuthError(error);
    }

    return {
      email,
      needsEmailVerification: true,
    };
  }

  async resendVerification(email: string): Promise<void> {
    try {
      await this.auth.api.sendVerificationEmail({
        body: { email: email.toLowerCase() },
      });
    } catch (error) {
      if (error instanceof APIError && error.status === 'BAD_REQUEST') {
        return;
      }
      throw this.mapAuthError(error);
    }
  }

  async me(userId: string): Promise<User> {
    return toUser(await this.getUserRow(userId));
  }

  async completeOnboarding(
    userId: string,
    input: { nickname: string; jobClass: JobClass },
  ): Promise<User> {
    const userRow = await this.getUserRow(userId);
    if (userRow.jobClass) {
      return toUser(userRow);
    }

    const nickname = input.nickname.replaceAll('#', '').slice(0, 20).trim();
    if (!nickname) {
      throw new BadRequestException('nickname must not be empty');
    }

    const tag = nickname === userRow.nickname ? userRow.tag : await allocateTag(this.db, nickname);

    const [updated] = await this.db
      .update(users)
      .set({
        nickname,
        name: nickname,
        tag,
        jobClass: input.jobClass,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new UnauthorizedException();
    }
    return toUser(updated);
  }

  async withdraw(
    session: UserSession,
    input: { password?: string; idToken?: string },
  ): Promise<void> {
    await this.confirmWithdraw(session, input);
    await this.db.delete(users).where(eq(users.id, session.user.id));
  }

  /** 세션만으로는 탈퇴를 받지 않는다. 비밀번호 계정은 비밀번호, Google 계정은 ID 토큰으로 다시 확인한다. */
  private async confirmWithdraw(
    session: UserSession,
    input: { password?: string; idToken?: string },
  ): Promise<void> {
    if (input.password) {
      const [credential] = await this.db
        .select({ password: accounts.password })
        .from(accounts)
        .where(and(eq(accounts.userId, session.user.id), eq(accounts.providerId, 'credential')))
        .limit(1);
      if (!credential?.password) {
        throw new ForbiddenException('Password confirmation is not available');
      }

      const context = await this.auth.instance.$context;
      const matched = await context.password.verify({
        hash: credential.password,
        password: input.password,
      });
      if (!matched) {
        throw new ForbiddenException('Invalid password');
      }
      return;
    }

    if (!input.idToken) {
      throw new ForbiddenException('Google confirmation required');
    }

    const [googleAccount] = await this.db
      .select({ accountId: accounts.accountId })
      .from(accounts)
      .where(and(eq(accounts.userId, session.user.id), eq(accounts.providerId, 'google')))
      .limit(1);
    if (!googleAccount) {
      throw new ForbiddenException('Google confirmation is not available');
    }

    const audience = this.config.get<string>('GOOGLE_CLIENT_ID', '');
    const subject = await this.googleSubjectFromIdToken(input.idToken, audience);
    if (!subject || subject !== googleAccount.accountId) {
      throw new ForbiddenException('Google confirmation failed');
    }
  }

  private async googleSubjectFromIdToken(
    idToken: string,
    audience: string,
  ): Promise<string | null> {
    const response = await fetch('https://oauth2.googleapis.com/tokeninfo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken }).toString(),
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { aud?: string; sub?: string };
    if (!audience || payload.aud !== audience) {
      return null;
    }
    return payload.sub ?? null;
  }

  private async getUserRow(userId: string) {
    const [userRow] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!userRow) {
      throw new UnauthorizedException();
    }
    return userRow;
  }

  private mapAuthError(error: unknown): never {
    if (!(error instanceof APIError)) {
      throw error;
    }

    const status = error.statusCode ?? 400;
    const message = error.body?.message ?? error.message;

    if (status === 422 || error.body?.code === 'USER_ALREADY_EXISTS') {
      throw new ConflictException('Email already registered');
    }
    if (status === 503 || message?.includes('not configured')) {
      throw new ServiceUnavailableException('Email sending is not configured');
    }
    if (status >= 500) {
      throw new InternalServerErrorException();
    }
    throw new HttpException(message || 'Auth request failed', status);
  }
}
