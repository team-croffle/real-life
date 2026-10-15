import type { Progress } from '@nest-vue/shared';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';

import { ProgressService } from './progress.service';

@Controller('progress')
@UseGuards(AuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  getProgress(@Session() session: UserSession): Promise<Progress> {
    return this.progressService.getProgress(session.user.id);
  }
}
