import type { QuestCategory, QuestDifficulty, QuestWeekday } from '@nest-vue/shared';
import {
  QUEST_CATEGORIES,
  QUEST_DIFFICULTIES,
  QUEST_TITLE_MAX,
  QUEST_WEEKDAYS,
} from '@nest-vue/shared';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateRoutineDto {
  @IsOptional()
  @IsIn(QUEST_CATEGORIES)
  category?: QuestCategory;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(QUEST_TITLE_MAX)
  title?: string;

  @IsOptional()
  @IsIn(QUEST_DIFFICULTIES)
  difficulty?: QuestDifficulty;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(QUEST_WEEKDAYS, { each: true })
  weekdays?: QuestWeekday[];

  @IsOptional()
  @IsBoolean()
  biweekly?: boolean;
}
