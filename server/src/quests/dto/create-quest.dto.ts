import type { QuestCategory, QuestDifficulty, QuestPace } from '@nest-vue/shared';
import {
  QUEST_CATEGORIES,
  QUEST_DIFFICULTIES,
  QUEST_PACES,
  QUEST_TITLE_MAX,
} from '@nest-vue/shared';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateQuestDto {
  @IsIn(QUEST_CATEGORIES)
  category!: QuestCategory;

  @IsString()
  @MinLength(1)
  @MaxLength(QUEST_TITLE_MAX)
  title!: string;

  @IsIn(QUEST_DIFFICULTIES)
  difficulty!: QuestDifficulty;

  /** 없으면 steady */
  @IsOptional()
  @IsIn(QUEST_PACES)
  pace?: QuestPace;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endsOn!: string;
}
