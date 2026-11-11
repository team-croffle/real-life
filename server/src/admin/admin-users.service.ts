import type { AdminUserListItem, Paginated } from '@nest-vue/shared';
import { ADMIN_USER_PAGE_SIZE, isAccountSuspended } from '@nest-vue/shared';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { count, desc, eq, ilike, or } from 'drizzle-orm';

import { deleteUserAccount } from '../auth/delete-user-account';
import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import { sessions } from '../database/schema/sessions';
import { userProgress } from '../database/schema/user-progress';
import { users } from '../database/schema/users';
import type { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import type { SuspendUserDto } from './dto/suspend-user.dto';

@Injectable()
export class AdminUsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list(query: ListAdminUsersQueryDto): Promise<Paginated<AdminUserListItem>> {
    const page = query.page ?? 1;
    const size = query.size ?? ADMIN_USER_PAGE_SIZE;
    const needle = query.q?.trim();
    const search =
      needle && needle.length > 0
        ? or(ilike(users.email, `%${needle}%`), ilike(users.nickname, `%${needle}%`))
        : undefined;

    const [countRow] = await this.db.select({ total: count() }).from(users).where(search);
    const total = Number(countRow?.total ?? 0);
    const totalPages = Math.ceil(total / size);
    if (page > Math.max(totalPages, 1)) {
      throw new BadRequestException('page is out of range');
    }

    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        nickname: users.nickname,
        tag: users.tag,
        createdAt: users.createdAt,
        suspended: users.suspended,
        suspendedUntil: users.suspendedUntil,
        suspendReason: users.suspendReason,
        level: userProgress.level,
      })
      .from(users)
      .leftJoin(userProgress, eq(userProgress.userId, users.id))
      .where(search)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(size)
      .offset((page - 1) * size);

    const now = new Date();
    return {
      items: rows.map((row) => {
        const active = isAccountSuspended(
          { suspended: row.suspended, suspendedUntil: row.suspendedUntil },
          now,
        );
        return {
          id: row.id,
          email: row.email,
          nickname: row.nickname,
          tag: row.tag,
          createdAt: row.createdAt.toISOString(),
          level: row.level ?? 1,
          suspendedUntil: active ? (row.suspendedUntil?.toISOString() ?? null) : null,
          suspendReason: active ? row.suspendReason : null,
        };
      }),
      page,
      size,
      total,
      totalPages,
    };
  }

  async suspend(userId: string, dto: SuspendUserDto): Promise<AdminUserListItem> {
    if (dto.until) {
      const until = new Date(dto.until);
      if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
        throw new BadRequestException('until must be in the future');
      }
    }

    return this.db.transaction(async (tx) => {
      const [userRow] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for('update')
        .limit(1);
      if (!userRow) {
        throw new NotFoundException();
      }
      if (userRow.role === 'admin') {
        throw new ForbiddenException('admin accounts cannot be suspended');
      }

      const suspendedUntil =
        dto.until === undefined || dto.until === null ? null : new Date(dto.until);
      const suspendReason = dto.reason === undefined || dto.reason === null ? null : dto.reason;
      const [updated] = await tx
        .update(users)
        .set({
          suspended: true,
          suspendedUntil,
          suspendReason,
        })
        .where(eq(users.id, userId))
        .returning();
      if (!updated) {
        throw new NotFoundException();
      }
      await tx.delete(sessions).where(eq(sessions.userId, userId));
      return this.toListItem(updated);
    });
  }

  async unsuspend(userId: string): Promise<AdminUserListItem> {
    return this.db.transaction(async (tx) => {
      const [userRow] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for('update')
        .limit(1);
      if (!userRow) {
        throw new NotFoundException();
      }
      if (userRow.role === 'admin') {
        throw new ForbiddenException('admin accounts cannot be suspended');
      }

      const [updated] = await tx
        .update(users)
        .set({
          suspended: false,
          suspendedUntil: null,
          suspendReason: null,
        })
        .where(eq(users.id, userId))
        .returning();
      if (!updated) {
        throw new NotFoundException();
      }
      return this.toListItem(updated);
    });
  }

  async remove(userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [userRow] = await tx
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .for('update')
        .limit(1);
      if (!userRow) {
        throw new NotFoundException();
      }
      if (userRow.role === 'admin') {
        throw new ForbiddenException('admin accounts cannot be deleted');
      }
      await deleteUserAccount(tx, userId);
    });
  }

  private toListItem(userRow: typeof users.$inferSelect, level = 1): AdminUserListItem {
    const now = new Date();
    const active = isAccountSuspended(userRow, now);
    return {
      id: userRow.id,
      email: userRow.email,
      nickname: userRow.nickname,
      tag: userRow.tag,
      createdAt: userRow.createdAt.toISOString(),
      level,
      suspendedUntil: active ? (userRow.suspendedUntil?.toISOString() ?? null) : null,
      suspendReason: active ? userRow.suspendReason : null,
    };
  }
}
