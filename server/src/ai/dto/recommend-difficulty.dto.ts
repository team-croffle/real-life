import { QUEST_TITLE_MAX } from '@nest-vue/shared';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RecommendDifficultyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(QUEST_TITLE_MAX)
  title!: string;
}
