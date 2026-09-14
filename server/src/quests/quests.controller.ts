import type { CreateQuestResult } from '@nest-vue/shared';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import type { RequestAuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateQuestDto } from './dto/create-quest.dto';
import { QuestsService } from './quests.service';

@Controller('quests')
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: RequestAuthUser,
    @Body() dto: CreateQuestDto,
  ): Promise<CreateQuestResult> {
    return this.questsService.create(user.id, dto);
  }
}
