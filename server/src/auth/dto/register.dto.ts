import type { RegisterPayload } from '@nest-vue/shared';
import { JOB_CLASSES } from '@nest-vue/shared';
import { IsEmail, IsIn, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterDto implements RegisterPayload {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @Length(1, 20)
  @Matches(/^[^#]+$/)
  nickname!: string;

  @IsIn(JOB_CLASSES)
  jobClass!: RegisterPayload['jobClass'];
}
