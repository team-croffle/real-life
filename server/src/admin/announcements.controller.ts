import type { Announcement } from '@nest-vue/shared';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';

import { AllowWithoutJob } from '../auth/allow-without-job';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
@AllowWithoutJob()
@UseGuards(AuthGuard)
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  list(): Promise<Announcement[]> {
    return this.announcements.list();
  }
}
