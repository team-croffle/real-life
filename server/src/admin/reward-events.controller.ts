import type { CurrentRewardEvent } from '@nest-vue/shared';
import { Controller, Get, HttpStatus, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';

import { AllowWithoutJob } from '../auth/allow-without-job';
import { RewardEventsService } from './reward-events.service';

@Controller('reward-events')
@AllowWithoutJob()
@UseGuards(AuthGuard)
export class RewardEventsController {
  constructor(private readonly rewardEvents: RewardEventsService) {}

  @Get('current')
  async current(@Res({ passthrough: true }) res: Response): Promise<CurrentRewardEvent | void> {
    const current = await this.rewardEvents.current();
    if (!current) {
      res.status(HttpStatus.NO_CONTENT);
      return;
    }
    return current;
  }
}
