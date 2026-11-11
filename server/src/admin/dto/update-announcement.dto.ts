import type { UpdateAnnouncementPayload } from '@nest-vue/shared';
import { ANNOUNCEMENT_BODY_MAX, ANNOUNCEMENT_TITLE_MAX } from '@nest-vue/shared';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAnnouncementDto implements UpdateAnnouncementPayload {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(ANNOUNCEMENT_TITLE_MAX)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(ANNOUNCEMENT_BODY_MAX)
  body?: string;
}
