import type { Announcement } from '@nest-vue/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';

import { AllowWithoutJob } from '../auth/allow-without-job';
import { AdminGuard } from './admin.guard';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Controller('admin/announcements')
@AllowWithoutJob()
@UseGuards(AuthGuard, AdminGuard)
export class AdminAnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  list(): Promise<Announcement[]> {
    return this.announcements.list();
  }

  @Post()
  create(@Body() dto: CreateAnnouncementDto): Promise<Announcement> {
    return this.announcements.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) announcementId: string,
    @Body() dto: UpdateAnnouncementDto,
  ): Promise<Announcement> {
    return this.announcements.update(announcementId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) announcementId: string): Promise<void> {
    await this.announcements.remove(announcementId);
  }
}
