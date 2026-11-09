import type { DifficultyRecommendation } from '@nest-vue/shared';
import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';

import { DifficultyService } from './difficulty.service';
import { RecommendDifficultyDto } from './dto/recommend-difficulty.dto';

@Controller('ai')
export class DifficultyController {
  constructor(private readonly difficultyService: DifficultyService) {}

  @Post('difficulty-recommendations')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  recommend(
    @Session() session: UserSession,
    @Body() dto: RecommendDifficultyDto,
  ): Promise<DifficultyRecommendation> {
    return this.difficultyService.recommend(session.user.id, dto);
  }
}
