import type { CreateQuestResult } from '@nest-vue/shared';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';

import { CreateQuestDto } from './dto/create-quest.dto';
import { QuestsService } from './quests.service';

@Controller('quests')
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Session() session: UserSession, @Body() dto: CreateQuestDto): Promise<CreateQuestResult> {
    return this.questsService.create(session.user.id, dto);
  }
}
