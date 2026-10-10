import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { JobChangeModule } from './job-change/job-change.module';
import { QuestsModule } from './quests/quests.module';
import { StatsModule } from './stats/stats.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      expandVariables: true,
    }),
    DatabaseModule,
    AuthModule,
    QuestsModule,
    StatsModule,
    WalletModule,
    JobChangeModule,
  ],
})
export class AppModule {}
