import type {
  QuestCategory,
  QuestDifficulty,
  QuestPace,
  QuestSchedule,
  QuestWeekday,
} from '@nest-vue/shared';
import {
  BOSS_SUBQUEST_MAX,
  QUEST_CATEGORIES,
  QUEST_DIFFICULTIES,
  QUEST_PACES,
  QUEST_SCHEDULES,
  QUEST_TITLE_MAX,
  QUEST_WEEKDAYS,
} from '@nest-vue/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class ConfirmBossQuestDto {
  @IsIn(QUEST_CATEGORIES)
  category!: QuestCategory;

  @IsString()
  @MinLength(1)
  @MaxLength(QUEST_TITLE_MAX)
  title!: string;

  @IsIn(QUEST_DIFFICULTIES)
  difficulty!: QuestDifficulty;

  @IsIn(QUEST_SCHEDULES)
  schedule!: QuestSchedule;

  @ValidateIf((dto: ConfirmBossQuestDto) => dto.schedule === 'deadline')
  @IsDefined()
  @IsIn(QUEST_PACES)
  pace?: QuestPace;

  @ValidateIf((dto: ConfirmBossQuestDto) => dto.schedule === 'routine')
  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(QUEST_WEEKDAYS, { each: true })
  weekdays?: QuestWeekday[];

  @ValidateIf((dto: ConfirmBossQuestDto) => dto.schedule === 'routine')
  @IsDefined()
  @IsBoolean()
  biweekly?: boolean;

  @ValidateIf((dto: ConfirmBossQuestDto) => dto.schedule === 'deadline')
  @IsDefined()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endsOn?: string;
}

export class ConfirmBossDto {
  @IsString()
  @MinLength(1)
  @MaxLength(QUEST_TITLE_MAX)
  goal!: string;

  @IsIn(QUEST_CATEGORIES)
  category!: QuestCategory;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  deadlineOn!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BOSS_SUBQUEST_MAX)
  @ValidateNested({ each: true })
  @Type(() => ConfirmBossQuestDto)
  quests!: ConfirmBossQuestDto[];
}
