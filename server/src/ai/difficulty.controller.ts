import type { DifficultyRecommendation } from '@nest-vue/shared';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';

import { DifficultyService } from './difficulty.service';
import { RecommendDifficultyDto } from './dto/recommend-difficulty.dto';

@Controller('ai')
export class DifficultyController {
  constructor(private readonly difficultyService: DifficultyService) {}

  @Post('difficulty-recommendations')
  @UseGuards(AuthGuard)
  recommend(@Body() dto: RecommendDifficultyDto): Promise<DifficultyRecommendation> {
    return this.difficultyService.recommend(dto);
  }
}
