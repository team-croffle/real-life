import type {
  QuestCategory,
  QuestDifficulty,
  QuestKind,
  QuestSchedule,
  QuestWeekday,
} from '@nest-vue/shared';
import {
  QUEST_CATEGORIES,
  QUEST_DIFFICULTIES,
  QUEST_KINDS,
  QUEST_SCHEDULES,
  QUEST_WEEKDAYS,
} from '@nest-vue/shared';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateQuestDto {
  @IsIn(QUEST_KINDS)
  kind!: QuestKind;

  @IsIn(QUEST_CATEGORIES)
  category!: QuestCategory;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsIn(QUEST_DIFFICULTIES)
  difficulty!: QuestDifficulty;

  @IsIn(QUEST_SCHEDULES)
  schedule!: QuestSchedule;

  @ValidateIf((dto: CreateQuestDto) => dto.schedule === 'routine')
  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(QUEST_WEEKDAYS, { each: true })
  weekdays?: QuestWeekday[];

  @ValidateIf((dto: CreateQuestDto) => dto.schedule === 'routine')
  @IsDefined()
  @IsBoolean()
  biweekly?: boolean;

  @ValidateIf((dto: CreateQuestDto) => dto.schedule === 'deadline')
  @IsDefined()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endsOn?: string;
}
