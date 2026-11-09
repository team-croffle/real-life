import type { QuestCategory } from '@nest-vue/shared';
import { QUEST_CATEGORIES, QUEST_TITLE_MAX } from '@nest-vue/shared';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class RecommendDifficultyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(QUEST_TITLE_MAX)
  title!: string;

  @IsIn(QUEST_CATEGORIES)
  category!: QuestCategory;
}
