import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { QuestsModule } from './quests/quests.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      expandVariables: true,
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    QuestsModule,
  ],
})
export class AppModule {}
