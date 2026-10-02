import type {
  CreateQuestResult,
  QuestCompletionResult,
  QuestDayMarkResult,
} from '@nest-vue/shared';
import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';

import { CompleteQuestDto } from './dto/complete-quest.dto';
import { CreateQuestDto } from './dto/create-quest.dto';
import { QuestCompletionService } from './quest-completion.service';
import { QuestsService } from './quests.service';

@Controller('quests')
export class QuestsController {
  constructor(
    private readonly questsService: QuestsService,
    private readonly questCompletionService: QuestCompletionService,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Session() session: UserSession, @Body() dto: CreateQuestDto): Promise<CreateQuestResult> {
    return this.questsService.create(session.user.id, dto);
  }

  @Post(':id/complete')
  @UseGuards(AuthGuard)
  complete(
    @Session() session: UserSession,
    @Param('id') questId: string,
    @Body() dto: CompleteQuestDto,
  ): Promise<QuestCompletionResult> {
    return this.questCompletionService.complete(session.user.id, questId, dto);
  }

  @Post(':id/day-marks')
  @UseGuards(AuthGuard)
  markToday(
    @Session() session: UserSession,
    @Param('id') questId: string,
  ): Promise<QuestDayMarkResult> {
    return this.questCompletionService.markToday(session.user.id, questId);
  }
}
