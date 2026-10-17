import type {
  CreateQuestResult,
  QuestCompletionResult,
  QuestDayMarkResult,
  QuestListItem,
  QuestRoutineRestResult,
} from '@nest-vue/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
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

  @Get()
  @UseGuards(AuthGuard)
  list(@Session() session: UserSession): Promise<QuestListItem[]> {
    return this.questsService.list(session.user.id);
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

  @Post(':id/rest')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  rest(
    @Session() session: UserSession,
    @Param('id') questId: string,
  ): Promise<QuestRoutineRestResult> {
    return this.questsService.rest(session.user.id, questId);
  }

  @Post(':id/resume')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  resume(
    @Session() session: UserSession,
    @Param('id') questId: string,
  ): Promise<QuestRoutineRestResult> {
    return this.questsService.resume(session.user.id, questId);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  abandon(@Session() session: UserSession, @Param('id') questId: string): Promise<void> {
    return this.questsService.abandon(session.user.id, questId);
  }
}
