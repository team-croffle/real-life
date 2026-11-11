import type { CreateAnnouncementPayload } from '@nest-vue/shared';
import { ANNOUNCEMENT_BODY_MAX, ANNOUNCEMENT_TITLE_MAX } from '@nest-vue/shared';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAnnouncementDto implements CreateAnnouncementPayload {
  @IsString()
  @MinLength(1)
  @MaxLength(ANNOUNCEMENT_TITLE_MAX)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(ANNOUNCEMENT_BODY_MAX)
  body!: string;
}
