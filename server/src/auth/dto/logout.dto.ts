import type { LogoutPayload } from '@nest-vue/shared';
import { IsString, MinLength } from 'class-validator';

export class LogoutDto implements LogoutPayload {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
