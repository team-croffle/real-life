import type { QuestPenaltySettlement } from '@nest-vue/shared';
import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';

import { QuestPenaltyService } from './quest-penalty.service';

@Controller('quest-penalties')
export class QuestPenaltiesController {
  constructor(private readonly questPenaltyService: QuestPenaltyService) {}

  @Post('settle')
  @UseGuards(AuthGuard)
  settle(@Session() session: UserSession): Promise<QuestPenaltySettlement> {
    return this.questPenaltyService.settle(session.user.id);
  }
}
