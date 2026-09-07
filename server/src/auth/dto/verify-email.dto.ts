import type { VerifyEmailPayload } from '@nest-vue/shared';
import { IsString, MinLength } from 'class-validator';

export class VerifyEmailDto implements VerifyEmailPayload {
  @IsString()
  @MinLength(1)
  token!: string;
}
