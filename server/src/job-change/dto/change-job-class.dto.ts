import type { JobChangeReason, JobClass } from '@nest-vue/shared';
import { JOB_CHANGE_REASONS, JOB_CLASSES } from '@nest-vue/shared';
import { IsIn, IsOptional } from 'class-validator';

export class ChangeJobClassDto {
  @IsIn(JOB_CLASSES)
  jobClass!: JobClass;

  @IsOptional()
  @IsIn(JOB_CHANGE_REASONS)
  reason?: JobChangeReason;
}
