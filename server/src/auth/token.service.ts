import { createHash } from 'node:crypto';

import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';

import { ONBOARDING_TOKEN_TYPE, REFRESH_TOKEN_TYPE } from './auth.constants';
import type { OnboardingTokenPayload, RefreshTokenPayload } from './auth.types';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  expiresAtFromTtl(ttl: string): Date {
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

  async verifyRefresh(token: string): Promise<RefreshTokenPayload> {
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

  async verifyOnboarding(token: string): Promise<OnboardingTokenPayload> {
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

  async verifyGoogleIdToken(idToken: string): Promise<{ sub: string; email: string }> {
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
}
