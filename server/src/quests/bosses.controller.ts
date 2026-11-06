import type { BossSummary, ConfirmedBoss } from '@nest-vue/shared';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';

import { BossPlanService } from './boss-plan.service';
import { ConfirmBossDto } from './dto/confirm-boss.dto';

@Controller('bosses')
export class BossesController {
  constructor(private readonly bossPlanService: BossPlanService) {}

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
}
