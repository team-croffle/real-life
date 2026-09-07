import type { WithdrawPayload } from '@nest-vue/shared';
import { Equals, IsOptional, IsString, MinLength } from 'class-validator';

export class WithdrawDto implements WithdrawPayload {
  @Equals(true)
  confirm!: true;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  idToken?: string;
}
