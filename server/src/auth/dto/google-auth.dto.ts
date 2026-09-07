import type { GoogleAuthPayload } from '@nest-vue/shared';
import { IsString, MinLength } from 'class-validator';

export class GoogleAuthDto implements GoogleAuthPayload {
  @IsString()
  @MinLength(1)
  idToken!: string;
}
