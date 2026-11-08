import type {
  CreateRoutinePayload,
  QuestCategory,
  QuestDifficulty,
  QuestWeekday,
} from '@nest-vue/shared';
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
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRoutineDto implements CreateRoutinePayload {
  @IsIn(QUEST_CATEGORIES)
  category!: QuestCategory;

  @IsString()
  @MinLength(1)
  @MaxLength(QUEST_TITLE_MAX)
  title!: string;

  @IsIn(QUEST_DIFFICULTIES)
  difficulty!: QuestDifficulty;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(QUEST_WEEKDAYS, { each: true })
  weekdays!: QuestWeekday[];

  @IsBoolean()
  biweekly!: boolean;
}
