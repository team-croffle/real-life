import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AdminModule } from './admin/admin.module';
import { AiQueueModule } from './ai-queue/ai-queue.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { ClientIpModule } from './common/client-ip.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { JobChangeModule } from './job-change/job-change.module';
import { ProgressModule } from './progress/progress.module';
import { QuestsModule } from './quests/quests.module';
import { ShopModule } from './shop/shop.module';
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
    ScheduleModule.forRoot(),
    DatabaseModule,
    HealthModule,
    AiModule,
    AiQueueModule,
    // AuthModule보다 위. 둘 다 configure에서 httpAdapter.use를 쓰므로 순서가 바뀌면 Better Auth가 정리 전 연결 IP 헤더를 믿는다.
    ClientIpModule,
    AuthModule,
    AdminModule,
    QuestsModule,
    ProgressModule,
    StatsModule,
    WalletModule,
    ShopModule,
    JobChangeModule,
  ],
})
export class AppModule {}
