import { Module } from '@nestjs/common';

import { JobChangeController } from './job-change.controller';
import { JobChangeService } from './job-change.service';

@Module({
  controllers: [JobChangeController],
  providers: [JobChangeService],
})
export class JobChangeModule {}
