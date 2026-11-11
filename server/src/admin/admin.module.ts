import { Module } from '@nestjs/common';

import { AdminAnnouncementsController } from './admin-announcements.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminGuard } from './admin.guard';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

@Module({
  controllers: [AdminUsersController, AdminAnnouncementsController, AnnouncementsController],
  providers: [AdminGuard, AdminUsersService, AnnouncementsService],
})
export class AdminModule {}
