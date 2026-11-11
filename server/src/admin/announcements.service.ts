import type { Announcement } from '@nest-vue/shared';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import { announcements } from '../database/schema/announcements';
import type { CreateAnnouncementDto } from './dto/create-announcement.dto';
import type { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list(): Promise<Announcement[]> {
    const rows = await this.db.select().from(announcements).orderBy(desc(announcements.createdAt));
    return rows.map(toAnnouncement);
  }

  async create(dto: CreateAnnouncementDto): Promise<Announcement> {
    const title = dto.title.trim();
    const body = dto.body.trim();
    if (title.length < 1) {
      throw new BadRequestException('title must not be empty');
    }
    if (body.length < 1) {
      throw new BadRequestException('body must not be empty');
    }
    const [row] = await this.db.insert(announcements).values({ title, body }).returning();
    if (!row) {
      throw new BadRequestException('could not create announcement');
    }
    return toAnnouncement(row);
  }

  async update(announcementId: string, dto: UpdateAnnouncementDto): Promise<Announcement> {
    if (dto.title === undefined && dto.body === undefined) {
      throw new BadRequestException('empty body');
    }
    const title = dto.title === undefined ? undefined : dto.title.trim();
    const body = dto.body === undefined ? undefined : dto.body.trim();
    if (title !== undefined && title.length < 1) {
      throw new BadRequestException('title must not be empty');
    }
    if (body !== undefined && body.length < 1) {
      throw new BadRequestException('body must not be empty');
    }
    const [row] = await this.db
      .update(announcements)
      .set({
        ...(title === undefined ? {} : { title }),
        ...(body === undefined ? {} : { body }),
      })
      .where(eq(announcements.id, announcementId))
      .returning();
    if (!row) {
      throw new NotFoundException();
    }
    return toAnnouncement(row);
  }

  async remove(announcementId: string): Promise<void> {
    const deleted = await this.db
      .delete(announcements)
      .where(eq(announcements.id, announcementId))
      .returning({ id: announcements.id });
    if (deleted.length === 0) {
      throw new NotFoundException();
    }
  }
}

function toAnnouncement(row: typeof announcements.$inferSelect): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
