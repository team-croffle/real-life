import type { JobClass } from '@nest-vue/shared';
import { JOB_CLASSES } from '@nest-vue/shared';
import { Transform } from 'class-transformer';
import { IsIn, IsString, Length, Matches } from 'class-validator';

export class CompleteOnboardingDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 20)
  @Matches(/^[^#]+$/)
  nickname!: string;

  @IsIn(JOB_CLASSES)
  jobClass!: JobClass;
}
