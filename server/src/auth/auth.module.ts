import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import { AccountStatusGuard } from './account-status.guard';
import { createAuth } from './auth';
import { AuthController } from './auth.controller';
import { JobClassGuard } from './job-class.guard';
import { MailSendLimiter } from './mail-send-limiter';
import { ProfileService } from './profile.service';

@Module({
  imports: [
    BetterAuthModule.forRootAsync({
      isGlobal: true,
      disableGlobalAuthGuard: true,
      inject: [DRIZZLE, ConfigService],
      useFactory: (db: DrizzleDb, config: ConfigService) => {
        const corsOrigin = valueOrDevDefault(config, 'CORS_ORIGIN', 'http://localhost:5173');
        const webOrigin = (config.get<string>('WEB_ORIGIN')?.trim() || corsOrigin).replace(
          /\/$/,
          '',
        );
        return {
          auth: createAuth(db, {
            secret: config.getOrThrow<string>('BETTER_AUTH_SECRET'),
            baseURL: valueOrDevDefault(config, 'BETTER_AUTH_URL', 'http://localhost:3000'),
            trustedOrigins: [corsOrigin, webOrigin],
            webOrigin,
            googleClientId: config.get<string>('GOOGLE_CLIENT_ID', ''),
            googleClientSecret: config.get<string>('GOOGLE_CLIENT_SECRET', ''),
            smtpUser: valueOrDevDefault(config, 'SMTP_USER', ''),
            smtpPass: valueOrDevDefault(config, 'SMTP_PASS', ''),
            smtpHost: config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
            smtpPort: config.get<string>('SMTP_PORT', '587'),
            mailFrom: config.get<string>('MAIL_FROM', ''),
          }),
          disableTrustedOriginsCors: true,
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    ProfileService,
    MailSendLimiter,
    { provide: APP_GUARD, useClass: AccountStatusGuard },
    { provide: APP_GUARD, useClass: JobClassGuard },
  ],
  exports: [ProfileService],
})
export class AuthModule {}

function valueOrDevDefault(config: ConfigService, key: string, devDefault: string): string {
  const value = config.get<string>(key)?.trim() ?? '';
  if (config.get<string>('NODE_ENV') === 'production' && value === '') {
    throw new Error(`${key} is required when NODE_ENV=production`);
  }
  return value || devDefault;
}
