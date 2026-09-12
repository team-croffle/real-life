import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import { refreshTokens, users } from '../database/schema';
import { ACCESS_TOKEN_TYPE } from './auth.constants';
import type { AccessTokenPayload, RequestAuthUser } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<RequestAuthUser> {
    if (payload.typ !== ACCESS_TOKEN_TYPE || !payload.sub || !payload.sid) {
      throw new UnauthorizedException();
    }

    const [session] = await this.db
      .select({ userId: users.id })
      .from(refreshTokens)
      .innerJoin(users, eq(users.id, refreshTokens.userId))
      .where(
        and(
          eq(refreshTokens.id, payload.sid),
          eq(refreshTokens.userId, payload.sub),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException();
    }

    return { id: payload.sub };
  }
}
