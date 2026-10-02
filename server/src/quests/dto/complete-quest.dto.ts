import { QUEST_NOTE_MAX_LENGTH } from '@nest-vue/shared';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteQuestDto {
  @IsOptional()
  @IsString()
  @MaxLength(QUEST_NOTE_MAX_LENGTH)
  note?: string;
}
