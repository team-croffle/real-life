import { Module } from '@nestjs/common';

import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminGuard } from './admin.guard';

@Module({
  controllers: [AdminUsersController],
  providers: [AdminGuard, AdminUsersService],
})
export class AdminModule {}
