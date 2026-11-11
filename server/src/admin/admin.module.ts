import { Module } from '@nestjs/common';

import { AdminAnnouncementsController } from './admin-announcements.controller';
import { AdminRewardEventsController } from './admin-reward-events.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminGuard } from './admin.guard';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { RewardEventsController } from './reward-events.controller';
import { RewardEventsService } from './reward-events.service';

@Module({
  controllers: [
    AdminUsersController,
    AdminAnnouncementsController,
    AdminRewardEventsController,
    AnnouncementsController,
    RewardEventsController,
  ],
  providers: [AdminGuard, AdminUsersService, AnnouncementsService, RewardEventsService],
  exports: [RewardEventsService],
})
export class AdminModule {}
