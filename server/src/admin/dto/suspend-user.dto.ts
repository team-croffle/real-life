import type { SuspendUserPayload } from '@nest-vue/shared';
import { SUSPEND_REASON_MAX } from '@nest-vue/shared';
import { IsISO8601, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class SuspendUserDto implements SuspendUserPayload {
  @IsOptional()
  @ValidateIf((_dto, value: unknown) => value !== null)
  @IsISO8601()
  until?: string | null;

  @IsOptional()
  @ValidateIf((_dto, value: unknown) => value !== null)
  @IsString()
  @MaxLength(SUSPEND_REASON_MAX)
  reason?: string | null;
}
