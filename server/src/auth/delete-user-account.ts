import { and, eq, inArray, isNotNull } from 'drizzle-orm';

import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import { bosses, monsters, quests, routines, users } from '../database/schema';

export async function deleteUserAccount(db: DrizzleDb | DrizzleTx, userId: string): Promise<void> {
  const [questMonsters, routineMonsters, bossMonsters] = await Promise.all([
    db
      .select({ id: quests.monsterId })
      .from(quests)
      .where(and(eq(quests.userId, userId), isNotNull(quests.monsterId))),
    db
      .select({ id: routines.monsterId })
      .from(routines)
      .where(and(eq(routines.userId, userId), isNotNull(routines.monsterId))),
    db
      .select({ id: bosses.monsterId })
      .from(bosses)
      .where(and(eq(bosses.userId, userId), isNotNull(bosses.monsterId))),
  ]);
  const monsterIds = [
    ...new Set(
      [...questMonsters, ...routineMonsters, ...bossMonsters].flatMap((row) =>
        row.id ? [row.id] : [],
      ),
    ),
  ];
  await db.delete(users).where(eq(users.id, userId));
  if (monsterIds.length > 0) {
    await db.delete(monsters).where(inArray(monsters.id, monsterIds));
  }
}
