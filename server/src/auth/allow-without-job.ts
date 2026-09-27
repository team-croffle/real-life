import { SetMetadata } from '@nestjs/common';

export const ALLOW_WITHOUT_JOB_KEY = 'allowWithoutJob';

export const AllowWithoutJob = () => SetMetadata(ALLOW_WITHOUT_JOB_KEY, true);
