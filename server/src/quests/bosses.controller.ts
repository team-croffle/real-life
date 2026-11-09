import type { AbandonedBoss, BossSummary, ConfirmedBoss } from '@nest-vue/shared';
import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';

import { BossJudgmentService } from './boss-judgment.service';
import { BossPlanService } from './boss-plan.service';
import { ConfirmBossDto } from './dto/confirm-boss.dto';
import { MonsterRetryService } from './monster-retry.service';

@Controller('bosses')
export class BossesController {
  constructor(
    private readonly bossPlanService: BossPlanService,
    private readonly bossJudgmentService: BossJudgmentService,
    private readonly monsterRetryService: MonsterRetryService,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  confirm(@Session() session: UserSession, @Body() dto: ConfirmBossDto): Promise<ConfirmedBoss> {
    return this.bossPlanService.confirm(session.user.id, dto);
  }

  @Get()
  @UseGuards(AuthGuard)
  list(@Session() session: UserSession): Promise<BossSummary[]> {
    return this.bossPlanService.list(session.user.id);
  }

  @Post(':id/monster')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  requeueMonster(@Session() session: UserSession, @Param('id') bossId: string): Promise<void> {
    return this.monsterRetryService.requeueBoss(session.user.id, bossId);
  }

  @Post(':id/abandon')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  abandon(@Session() session: UserSession, @Param('id') bossId: string): Promise<AbandonedBoss> {
    return this.bossJudgmentService.abandon(session.user.id, bossId);
  }
}
