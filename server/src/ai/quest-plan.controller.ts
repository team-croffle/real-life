import type { QuestPlan } from '@nest-vue/shared';
import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';

import { SuggestQuestPlanDto } from './dto/suggest-quest-plan.dto';
import { QuestPlanService } from './quest-plan.service';

@Controller('ai')
export class QuestPlanController {
  constructor(private readonly questPlanService: QuestPlanService) {}

  @Post('quest-plans')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  suggest(@Session() session: UserSession, @Body() dto: SuggestQuestPlanDto): Promise<QuestPlan> {
    return this.questPlanService.suggest(session.user.id, dto);
  }
}
