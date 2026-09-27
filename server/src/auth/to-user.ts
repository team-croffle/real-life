import type { User } from '@nest-vue/shared';
import { isJobClass } from '@nest-vue/shared';

import type { UserRow } from '../database/schema';

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    tag: row.tag,
    jobClass: isJobClass(row.jobClass) ? row.jobClass : null,
    role: row.role,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
