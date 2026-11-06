import { QUEST_TITLE_MAX } from '@nest-vue/shared';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SuggestQuestPlanDto {
  @IsString()
  @MinLength(1)
  @MaxLength(QUEST_TITLE_MAX)
  goal!: string;

  /** 보스 마감. 서울 달력 YYYY-MM-DD */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  deadlineOn!: string;
}
