import type { AdminUserListItem, Paginated } from '@nest-vue/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';

import { AllowWithoutJob } from '../auth/allow-without-job';
import { AdminUsersService } from './admin-users.service';
import { AdminGuard } from './admin.guard';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';

@Controller('admin/users')
@AllowWithoutJob()
@UseGuards(AuthGuard, AdminGuard)
export class AdminUsersController {
  constructor(private readonly adminUsers: AdminUsersService) {}

  @Get()
  list(@Query() query: ListAdminUsersQueryDto): Promise<Paginated<AdminUserListItem>> {
    return this.adminUsers.list(query);
  }

  @Post(':id/suspend')
  @HttpCode(200)
  suspend(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: SuspendUserDto,
  ): Promise<AdminUserListItem> {
    return this.adminUsers.suspend(userId, dto);
  }

  @Post(':id/unsuspend')
  @HttpCode(200)
  unsuspend(@Param('id', ParseUUIDPipe) userId: string): Promise<AdminUserListItem> {
    return this.adminUsers.unsuspend(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) userId: string): Promise<void> {
    await this.adminUsers.remove(userId);
  }
}
