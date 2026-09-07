import type { LoginPayload } from '@nest-vue/shared';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto implements LoginPayload {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
