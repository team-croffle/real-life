import type { JobClass } from '@nest-vue/shared';
import { JOB_CLASSES } from '@nest-vue/shared';
import { IsIn } from 'class-validator';

export class ChangeJobClassDto {
  @IsIn(JOB_CLASSES)
  jobClass!: JobClass;
}
