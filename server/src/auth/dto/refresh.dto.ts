import type { RefreshPayload } from '@nest-vue/shared';
import { IsString, MinLength } from 'class-validator';

export class RefreshDto implements RefreshPayload {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
