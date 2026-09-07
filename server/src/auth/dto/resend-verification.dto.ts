import type { ResendVerificationPayload } from '@nest-vue/shared';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto implements ResendVerificationPayload {
  @IsEmail()
  email!: string;
}
