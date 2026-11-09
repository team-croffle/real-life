import type {
  CreateQuestResult,
  Paginated,
  QuestCompletionResult,
  QuestDayMarkResult,
  QuestListItem,
} from '@nest-vue/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';

import { CompleteQuestDto } from './dto/complete-quest.dto';
import { CreateQuestDto } from './dto/create-quest.dto';
import { ListHistoryQueryDto } from './dto/list-history-query.dto';
import { MonsterRetryService } from './monster-retry.service';
import { QuestCompletionService } from './quest-completion.service';
import { QuestsService } from './quests.service';

@Controller('quests')
export class QuestsController {
  constructor(
    private readonly questsService: QuestsService,
    private readonly questCompletionService: QuestCompletionService,
    private readonly monsterRetryService: MonsterRetryService,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Session() session: UserSession, @Body() dto: CreateQuestDto): Promise<CreateQuestResult> {
    return this.questsService.create(session.user.id, dto);
  }

  @Get('history')
  @UseGuards(AuthGuard)
  history(
    @Session() session: UserSession,
    @Query() query: ListHistoryQueryDto,
  ): Promise<Paginated<QuestListItem>> {
    return this.questsService.history(session.user.id, query);
  }

  @Get()
  @UseGuards(AuthGuard)
  list(@Session() session: UserSession): Promise<QuestListItem[]> {
    return this.questsService.list(session.user.id);
  }

  @Post(':id/monster')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  requeueMonster(@Session() session: UserSession, @Param('id') questId: string): Promise<void> {
    return this.monsterRetryService.requeueQuest(session.user.id, questId);
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

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  abandon(@Session() session: UserSession, @Param('id') questId: string): Promise<void> {
    return this.questsService.abandon(session.user.id, questId);
  }
}
