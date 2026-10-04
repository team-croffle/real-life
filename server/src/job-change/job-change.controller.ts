import type { JobChangeResult, JobChangeStatus } from '@nest-vue/shared';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';

import { ChangeJobClassDto } from './dto/change-job-class.dto';
import { JobChangeService } from './job-change.service';

@Controller('job-class')
export class JobChangeController {
  constructor(private readonly jobChange: JobChangeService) {}

  @Get()
  @UseGuards(AuthGuard)
  status(@Session() session: UserSession): Promise<JobChangeStatus> {
    return this.jobChange.status(session.user.id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  change(
    @Session() session: UserSession,
    @Body() dto: ChangeJobClassDto,
  ): Promise<JobChangeResult> {
    return this.jobChange.change(session.user.id, dto);
  }
}
