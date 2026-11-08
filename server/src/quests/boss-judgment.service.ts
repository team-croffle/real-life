import type { AbandonedBoss } from '@nest-vue/shared';
import {
  QUEST_CATEGORY_STATS,
  appliedXpPenalty,
  applyLevelXp,
  bossCleared,
  bossClearReward,
  bossFailPenalty,
  bossShortfall,
} from '@nest-vue/shared';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { and, asc, eq, inArray, isNotNull, isNull, lte } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import type { BossRow } from '../database/schema/bosses';
import { bosses } from '../database/schema/bosses';
import { quests } from '../database/schema/quests';
import { routines } from '../database/schema/routines';
import { userProgress } from '../database/schema/user-progress';
import { userTitles } from '../database/schema/user-titles';
import { users } from '../database/schema/users';
import { WalletService } from '../wallet/wallet.service';

const BOSS_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ProgressSnapshot = {
  level: number;
  xp: number;
  gachaTicketCount: number;
  stamina: number;
  intellect: number;
  sense: number;
};

@Injectable()
export class BossJudgmentService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly walletService: WalletService,
  ) {}

  /** 정산 트랜잭션 안에서, 사용자·지갑·진행도를 잠근 뒤에 호출한다. 마감이 어제 이전인 진행 중 보스를 판정한다. */
  async judgeDue(
    tx: DrizzleTx,
    userId: string,
    yesterday: string,
  ): Promise<{ balance: number; level: number; levelXp: number } | null> {
    const dueRows = await tx
      .select()
      .from(bosses)
      .where(
        and(eq(bosses.userId, userId), isNull(bosses.result), lte(bosses.deadlineOn, yesterday)),
      )
      .orderBy(asc(bosses.id))
      .for('update');
    if (dueRows.length === 0) {
      return null;
    }

    const progress = await lockProgress(tx, userId);
    let level = progress.level;
    let levelXp = progress.xp;
    let ticketCount = progress.gachaTicketCount;
    let stamina = progress.stamina;
    let intellect = progress.intellect;
    let sense = progress.sense;
    const titleMarks = new Set<number>();
    const judgedAt = new Date();
    let balance = 0;

    // 앞 보스의 바닥을 반영한 뒤에 다음 보스를 계산한다.
    /* oxlint-disable no-await-in-loop */
    for (const bossRow of dueRows) {
      const paid = await this.payJudgment(tx, userId, bossRow, {
        level,
        xp: levelXp,
        gachaTicketCount: ticketCount,
        stamina,
        intellect,
        sense,
      });
      level = paid.level;
      levelXp = paid.xp;
      ticketCount = paid.gachaTicketCount;
      stamina = paid.stamina;
      intellect = paid.intellect;
      sense = paid.sense;
      balance = paid.balance;
      for (const mark of paid.titlesGranted) {
        titleMarks.add(mark);
      }
      await tx
        .update(bosses)
        .set({ result: paid.result, judgedAt })
        .where(eq(bosses.id, bossRow.id));
    }
    /* oxlint-enable no-await-in-loop */

    await tx
      .update(userProgress)
      .set({ level, xp: levelXp, gachaTicketCount: ticketCount, stamina, intellect, sense })
      .where(eq(userProgress.userId, userId));
    if (titleMarks.size > 0) {
      await tx
        .insert(userTitles)
        .values([...titleMarks].map((levelMark) => ({ userId, levelMark })))
        .onConflictDoNothing();
    }

    return { balance, level, levelXp };
  }

  async abandon(userId: string, bossId: string): Promise<AbandonedBoss> {
    if (!BOSS_ID_PATTERN.test(bossId)) {
      throw new NotFoundException();
    }

    return this.db.transaction(async (tx) => {
      const routineRows = await tx
        .select({ id: routines.id })
        .from(routines)
        .where(and(eq(routines.userId, userId), eq(routines.bossId, bossId)))
        .orderBy(asc(routines.id))
        .for('update');
      const questRows = await tx
        .select({ id: quests.id, completedOn: quests.completedOn })
        .from(quests)
        .where(and(eq(quests.userId, userId), eq(quests.bossId, bossId)))
        .orderBy(asc(quests.id))
        .for('update');
      await lockUser(tx, userId);
      const levelXp = await lockProgressXp(tx, userId);
      const [bossRow] = await tx
        .select()
        .from(bosses)
        .where(and(eq(bosses.id, bossId), eq(bosses.userId, userId)))
        .for('update');
      if (!bossRow) {
        throw new NotFoundException();
      }
      if (bossRow.result !== null) {
        throw new ConflictException('boss is already judged');
      }

      const loss = bossFailPenalty(bossShortfall(bossRow.maxHp, bossRow.hp));
      const gold = await this.walletService.applyClampedPenalty(
        tx,
        userId,
        loss.gold,
        { questId: null, bossId },
        'boss_abandon',
      );
      const xpLoss = appliedXpPenalty(levelXp, loss.xp);
      if (xpLoss > 0) {
        await tx
          .update(userProgress)
          .set({ xp: levelXp - xpLoss })
          .where(eq(userProgress.userId, userId));
      }
      await tx
        .update(bosses)
        .set({ result: 'abandoned', judgedAt: new Date() })
        .where(eq(bosses.id, bossId));

      const openIds = questRows.flatMap((questRow) =>
        questRow.completedOn === null ? [questRow.id] : [],
      );
      if (openIds.length > 0) {
        await tx.delete(quests).where(inArray(quests.id, openIds));
      }
      const routineIds = routineRows.map((routineRow) => routineRow.id);
      if (routineIds.length > 0) {
        await tx.delete(routines).where(inArray(routines.id, routineIds));
      }

      return {
        id: bossId,
        result: 'abandoned',
        gold: -gold.applied,
        xp: -xpLoss,
        tickets: 0,
        balance: gold.balance,
      };
    });
  }

  /** 정산이 커밋된 뒤, 찍기 전에 호출한다. 결과가 있는 보스의 루틴만 지운다. */
  async clearJudgedSubroutines(userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const routineRows = await tx
        .select({ id: routines.id })
        .from(routines)
        .innerJoin(bosses, eq(routines.bossId, bosses.id))
        .where(and(eq(routines.userId, userId), isNotNull(bosses.result)))
        .orderBy(asc(routines.id))
        .for('update', { of: routines });
      if (routineRows.length === 0) {
        return;
      }
      const routineIds = routineRows.map((routineRow) => routineRow.id);
      await tx
        .select({ id: quests.id })
        .from(quests)
        .where(inArray(quests.routineId, routineIds))
        .orderBy(asc(quests.id))
        .for('update');
      await lockUser(tx, userId);
      await tx.delete(routines).where(inArray(routines.id, routineIds));
    });
  }

  private async payJudgment(
    tx: DrizzleTx,
    userId: string,
    bossRow: BossRow,
    progress: ProgressSnapshot,
  ): Promise<
    ProgressSnapshot & {
      balance: number;
      result: 'cleared' | 'failed';
      titlesGranted: number[];
    }
  > {
    if (bossCleared(bossRow.maxHp, bossRow.hp)) {
      return this.payClear(tx, userId, bossRow, progress);
    }
    return this.payFail(tx, userId, bossRow, progress);
  }

  private async payClear(
    tx: DrizzleTx,
    userId: string,
    bossRow: BossRow,
    progress: ProgressSnapshot,
  ): Promise<
    ProgressSnapshot & {
      balance: number;
      result: 'cleared';
      titlesGranted: number[];
    }
  > {
    const reward = bossClearReward(bossRow.maxHp - bossRow.hp);
    const applied = applyLevelXp(progress.level, progress.xp, reward.xp);
    const stat = QUEST_CATEGORY_STATS[bossRow.category];
    const tickets = reward.tickets + applied.ticketsGranted;
    const balance = await this.walletService.applyBalanceDelta(
      tx,
      userId,
      reward.gold,
      'boss_clear',
      {
        questId: null,
        bossId: bossRow.id,
        tickets,
      },
    );
    return {
      level: applied.level,
      xp: applied.levelXp,
      gachaTicketCount: progress.gachaTicketCount + tickets,
      stamina: progress.stamina + (stat === 'stamina' ? reward.xp : 0),
      intellect: progress.intellect + (stat === 'intellect' ? reward.xp : 0),
      sense: progress.sense + (stat === 'sense' ? reward.xp : 0),
      balance,
      result: 'cleared',
      titlesGranted: applied.titlesGranted,
    };
  }

  private async payFail(
    tx: DrizzleTx,
    userId: string,
    bossRow: BossRow,
    progress: ProgressSnapshot,
  ): Promise<
    ProgressSnapshot & {
      balance: number;
      result: 'failed';
      titlesGranted: number[];
    }
  > {
    const loss = bossFailPenalty(bossShortfall(bossRow.maxHp, bossRow.hp));
    const gold = await this.walletService.applyClampedPenalty(
      tx,
      userId,
      loss.gold,
      { questId: null, bossId: bossRow.id },
      'boss_fail',
    );
    const xpLoss = appliedXpPenalty(progress.xp, loss.xp);
    return {
      ...progress,
      xp: progress.xp - xpLoss,
      balance: gold.balance,
      result: 'failed',
      titlesGranted: [],
    };
  }
}

async function lockUser(tx: DrizzleTx, userId: string): Promise<void> {
  const [userRow] = await tx
    .select({ jobClass: users.jobClass })
    .from(users)
    .where(eq(users.id, userId))
    .for('update');
  if (!userRow) {
    throw new UnauthorizedException();
  }
  if (!userRow.jobClass) {
    throw new ForbiddenException('job class required');
  }
}

async function lockProgress(tx: DrizzleTx, userId: string): Promise<ProgressSnapshot> {
  const [progressRow] = await tx
    .select({
      level: userProgress.level,
      xp: userProgress.xp,
      gachaTicketCount: userProgress.gachaTicketCount,
      stamina: userProgress.stamina,
      intellect: userProgress.intellect,
      sense: userProgress.sense,
    })
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .for('update');
  if (!progressRow) {
    throw new InternalServerErrorException('progress row missing');
  }
  return progressRow;
}

async function lockProgressXp(tx: DrizzleTx, userId: string): Promise<number> {
  const progress = await lockProgress(tx, userId);
  return progress.xp;
}
