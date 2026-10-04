import { Module } from '@nestjs/common';

import { WalletModule } from '../wallet/wallet.module';
import { JobChangeController } from './job-change.controller';
import { JobChangeService } from './job-change.service';

@Module({
  imports: [WalletModule],
  controllers: [JobChangeController],
  providers: [JobChangeService],
})
export class JobChangeModule {}
