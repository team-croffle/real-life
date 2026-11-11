import type { RewardEvent } from '@nest-vue/shared';
import { Body, Controller, Get, HttpStatus, Post, Put, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';

import { AllowWithoutJob } from '../auth/allow-without-job';
import { AdminGuard } from './admin.guard';
import { UpsertRewardEventDto } from './dto/upsert-reward-event.dto';
import { RewardEventsService } from './reward-events.service';

@Controller('admin/reward-events')
@AllowWithoutJob()
@UseGuards(AuthGuard, AdminGuard)
export class AdminRewardEventsController {
  constructor(private readonly rewardEvents: RewardEventsService) {}

  @Get()
  async getStored(@Res({ passthrough: true }) res: Response): Promise<RewardEvent | void> {
    const stored = await this.rewardEvents.getStored();
    if (!stored) {
      res.status(HttpStatus.NO_CONTENT);
      return;
    }
    return stored;
  }

  @Put()
  upsert(@Body() dto: UpsertRewardEventDto): Promise<RewardEvent> {
    return this.rewardEvents.upsert(dto);
  }

  @Post('end')
  async end(@Res({ passthrough: true }) res: Response): Promise<RewardEvent | void> {
    const ended = await this.rewardEvents.end();
    if (!ended) {
      res.status(HttpStatus.NO_CONTENT);
      return;
    }
    return ended;
  }
}
