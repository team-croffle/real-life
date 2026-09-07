import type { GoogleOnboardingPayload } from '@nest-vue/shared';
import { JOB_CLASSES } from '@nest-vue/shared';
import { IsIn, IsString, Length, Matches, MinLength } from 'class-validator';

export class GoogleOnboardingDto implements GoogleOnboardingPayload {
  @IsString()
  @MinLength(1)
  onboardingToken!: string;

  @IsString()
  @Length(1, 20)
  @Matches(/^[^#]+$/)
  nickname!: string;

  @IsIn(JOB_CLASSES)
  jobClass!: GoogleOnboardingPayload['jobClass'];
}
