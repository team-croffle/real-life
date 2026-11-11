import type { QuestCompletionResult, QuestDayMarkResult } from '@nest-vue/shared';
import {
  QUEST_CATEGORY_STATS,
  QUEST_DIFFICULTY_SCORES,
  QUEST_NOTE_MAX_LENGTH,
  applyLevelXp,
  comboRewardMultiplier,
  completionTableAmount,
  grantAmount,
  isMonsterKind,
  jobRewardMultiplier,
  xpRequiredToLevelUp,
} from '@nest-vue/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { RewardEventsService } from '../admin/reward-events.service';
import { AI, type Ai } from '../ai/ai';
import { AiCallLimiter } from '../ai/ai-call-limiter';
import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import { bosses } from '../database/schema/bosses';
import { monsters } from '../database/schema/monsters';
import { questDayMarks } from '../database/schema/quest-day-marks';
import type { QuestRow } from '../database/schema/quests';
import { quests } from '../database/schema/quests';
import { userProgress } from '../database/schema/user-progress';
import { userTitles } from '../database/schema/user-titles';
import { users } from '../database/schema/users';
import { wallets } from '../database/schema/wallets';
import { WalletService } from '../wallet/wallet.service';
import type { CompleteQuestDto } from './dto/complete-quest.dto';
import { appCalendarDate, calendarDaysBetween, isDeadlineInPeriod } from './quest-calendar';
import { QuestCritRoller } from './quest-crit.roller';
import { QuestPenaltyService } from './quest-penalty.service';

const QUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BATTLE_LOG_TIMEOUT_MS = 3_000;
const UNKNOWN_MONSTER_NAME = '이름 모를 몬스터';

@Injectable()
export class QuestCompletionService {
  private readonly logger = new Logger(QuestCompletionService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly walletService: WalletService,
    private readonly questPenaltyService: QuestPenaltyService,
    private readonly questCritRoller: QuestCritRoller,
    @Inject(AI) private readonly ai: Ai,
    private readonly aiCallLimiter: AiCallLimiter,
    private readonly rewardEvents: RewardEventsService,
  ) {}

  async complete(
    userId: string,
    questId: string,
    dto: CompleteQuestDto,
  ): Promise<QuestCompletionResult> {
    assertQuestId(questId);
    const note = normalizeNote(dto.note);
    await this.questPenaltyService.settle(userId);
    await this.assertCompletableNow(userId, questId);
    const battleLog = await this.battleLog(questId, note);

    return this.db.transaction(async (tx) => {
      const questRow = await lockQuest(tx, userId, questId);
      const today = appCalendarDate();
      const createdOn = appCalendarDate(questRow.createdAt);
      assertCompletable(questRow, createdOn, today);

      const pace = questRow.pace;
      const daySpan = calendarDaysBetween(createdOn, today);
      const markedDayCount =
        pace === 'once' || daySpan <= 0 ? 0 : await lockedMarkCount(tx, questRow.id, userId);
      const table = completionTableAmount(questRow.difficulty, daySpan, markedDayCount, pace);
      // 직업 변경은 users, 지갑, 진행도 순으로 잠근다. 오늘 첫 완료인지는 그 잠금 뒤에서만 본다.
      const jobClass = await requireJobClass(tx, userId);
      const balanceBefore = await lockWallet(tx, userId);
      const combo = await advanceComboOnFirstCompletion(tx, userId, today);
      const multiplier = jobRewardMultiplier(jobClass, questRow.category);
      const comboMultiplier = comboRewardMultiplier(combo.comboDayCount);
      const noteBonus = note !== null;
      // 외상(잔액이 음수)일 때는 크리티컬을 굴리지 않는다.
      const critMultiplier = balanceBefore < 0 ? 1 : this.questCritRoller.roll();
      const eventMultiplier = await this.rewardEvents.activeMultiplier(new Date(), tx);
      const gold = grantAmount(
        table.gold,
        table.markedDays,
        table.elapsedDays,
        multiplier,
        noteBonus,
        comboMultiplier,
        critMultiplier,
        eventMultiplier,
      );
      const xp = grantAmount(
        table.xp,
        table.markedDays,
        table.elapsedDays,
        multiplier,
        noteBonus,
        comboMultiplier,
        1,
        eventMultiplier,
      );

      const progress = await grantProgress(tx, userId, xp, QUEST_CATEGORY_STATS[questRow.category]);
      const balance = await this.walletService.applyBalanceDelta(tx, userId, gold, 'completion', {
        questId: questRow.id,
        bossId: null,
        tickets: progress.ticketsGranted,
      });
      if (questRow.bossId !== null) {
        await reduceBossHp(
          tx,
          userId,
          questRow.bossId,
          QUEST_DIFFICULTY_SCORES[questRow.difficulty],
        );
      }

      await tx
        .update(quests)
        .set({ completedOn: today, note, battleLog, gold, xp })
        .where(eq(quests.id, questRow.id));

      const statusEffect = await statusAfterCompletion(tx, userId);

      return {
        gold,
        xp,
        balance,
        level: progress.level,
        levelXp: progress.levelXp,
        xpToNext: xpRequiredToLevelUp(progress.level),
        ticketsGranted: progress.ticketsGranted,
        ticketCount: progress.ticketCount,
        titlesGranted: progress.titlesGranted,
        statusEffect,
        battleLog,
        applied: {
          baseGold: table.gold,
          baseXp: table.xp,
          markedDays: table.markedDays,
          elapsedDays: table.elapsedDays,
          jobMultiplier: multiplier,
          comboMultiplier,
          noteBonus,
          critMultiplier,
          eventMultiplier,
        },
      };
    });
  }

  async markToday(userId: string, questId: string): Promise<QuestDayMarkResult> {
    assertQuestId(questId);

    return this.db.transaction(async (tx) => {
      const questRow = await lockQuest(tx, userId, questId);
      const today = appCalendarDate();
      if (questRow.pace === 'once') {
        throw new BadRequestException('only weekly and long quests can mark a day');
      }

      const createdOn = appCalendarDate(questRow.createdAt);
      if (questRow.endsOn === createdOn) {
        throw new BadRequestException('only weekly and long quests can mark a day');
      }
      if (!isDeadlineInPeriod(createdOn, questRow.endsOn, today)) {
        throw new BadRequestException('today is outside the quest period');
      }
      if (questRow.completedOn !== null) {
        throw new ConflictException('completed quests cannot mark a day');
      }

      await tx
        .insert(questDayMarks)
        .values({
          questId: questRow.id,
          userId,
          doneOn: [today],
          markedDayCount: 1,
        })
        .onConflictDoUpdate({
          target: [questDayMarks.questId, questDayMarks.userId],
          set: {
            doneOn: sql`${questDayMarks.doneOn} || ARRAY[${today}]::date[]`,
            markedDayCount: sql`${questDayMarks.markedDayCount} + 1`,
          },
          where: sql`NOT (${questDayMarks.doneOn} @> ARRAY[${today}]::date[])`,
        });

      const [markRow] = await tx
        .select({
          doneOn: questDayMarks.doneOn,
          markedDayCount: questDayMarks.markedDayCount,
        })
        .from(questDayMarks)
        .where(and(eq(questDayMarks.questId, questRow.id), eq(questDayMarks.userId, userId)));

      if (!markRow) {
        throw new InternalServerErrorException('day mark row missing after insert');
      }

      return {
        doneOn: markRow.doneOn ?? [],
        markedDayCount: markRow.markedDayCount,
      };
    });
  }

  private async assertCompletableNow(userId: string, questId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const questRow = await readQuest(tx, userId, questId);
      const today = appCalendarDate();
      const createdOn = appCalendarDate(questRow.createdAt);
      assertCompletable(questRow, createdOn, today);
    });
  }

  private async monsterName(questId: string): Promise<string> {
    const [questRow] = await this.db
      .select({ monsterId: quests.monsterId })
      .from(quests)
      .where(eq(quests.id, questId));
    if (!questRow?.monsterId) {
      return UNKNOWN_MONSTER_NAME;
    }
    const [monsterRow] = await this.db
      .select({ kind: monsters.kind, name: monsters.name, description: monsters.description })
      .from(monsters)
      .where(eq(monsters.id, questRow.monsterId));
    if (!monsterRow || !isMonsterKind(monsterRow.kind)) {
      return UNKNOWN_MONSTER_NAME;
    }
    const name = monsterRow.name.trim();
    const description = monsterRow.description.trim();
    if (!name || !description) {
      return UNKNOWN_MONSTER_NAME;
    }
    return name;
  }

  private async battleLog(questId: string, note: string | null): Promise<string> {
    const name = await this.monsterName(questId);
    const preset = presetBattleLog(name);
    if (note === null) {
      return preset;
    }
    if (!this.aiCallLimiter.tryAcquire()) {
      this.logger.warn(`battle log fallback: direct call limit questId=${questId}`);
      return preset;
    }
    try {
      return await this.ai.writeBattleLog({ monsterName: name, note }, BATTLE_LOG_TIMEOUT_MS);
    } catch (error: unknown) {
      this.logger.warn(`battle log fallback questId=${questId} ${describeBattleLogError(error)}`);
      return preset;
    }
  }
}

function assertQuestId(questId: string): void {
  if (!QUEST_ID_PATTERN.test(questId)) {
    throw new NotFoundException();
  }
}

function normalizeNote(note: string | undefined): string | null {
  const trimmed = note?.trim() ?? '';
  if (trimmed.length > QUEST_NOTE_MAX_LENGTH) {
    throw new BadRequestException('note must be at most 500 characters');
  }
  return trimmed.length > 0 ? trimmed : null;
}

async function readQuest(tx: DrizzleTx, userId: string, questId: string): Promise<QuestRow> {
  const [questRow] = await tx
    .select()
    .from(quests)
    .where(and(eq(quests.id, questId), eq(quests.userId, userId)));

  if (!questRow) {
    throw new NotFoundException();
  }
  return questRow;
}

function presetBattleLog(name: string): string {
  return `싸움이 끝났다. 상대는 ${name}.\n오늘 할 일은 여기서 마친다.`;
}

function describeBattleLogError(error: unknown): string {
  if (!(error instanceof Error)) {
    return `Error: ${String(error)}`;
  }
  const cause = error.cause instanceof Error ? ` cause=${error.cause.message}` : '';
  return `${error.name}: ${error.message}${cause}`;
}

async function lockQuest(tx: DrizzleTx, userId: string, questId: string): Promise<QuestRow> {
  const [questRow] = await tx
    .select()
    .from(quests)
    .where(and(eq(quests.id, questId), eq(quests.userId, userId)))
    .for('update');

  if (!questRow) {
    throw new NotFoundException();
  }
  return questRow;
}

async function lockWallet(tx: DrizzleTx, userId: string): Promise<number> {
  await tx.insert(wallets).values({ userId }).onConflictDoNothing();
  const [walletRow] = await tx
    .select({ balance: wallets.balance })
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .for('update');

  if (!walletRow) {
    throw new InternalServerErrorException('wallet row missing after insert');
  }
  return walletRow.balance;
}

async function advanceComboOnFirstCompletion(
  tx: DrizzleTx,
  userId: string,
  today: string,
): Promise<{ comboDayCount: number }> {
  await tx.insert(userProgress).values({ userId }).onConflictDoNothing();
  const [progressRow] = await tx
    .select({
      comboDayCount: userProgress.comboDayCount,
      comboCountedOn: userProgress.comboCountedOn,
    })
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .for('update');

  if (!progressRow) {
    throw new InternalServerErrorException('progress row missing after insert');
  }
  if (progressRow.comboCountedOn >= today) {
    return { comboDayCount: progressRow.comboDayCount };
  }

  const comboDayCount = progressRow.comboDayCount + 1;
  await tx
    .update(userProgress)
    .set({ comboDayCount, comboCountedOn: today })
    .where(eq(userProgress.userId, userId));
  return { comboDayCount };
}

async function requireJobClass(tx: DrizzleTx, userId: string) {
  const [userRow] = await tx
    .select({ jobClass: users.jobClass })
    .from(users)
    .where(eq(users.id, userId))
    .for('update');

  if (!userRow?.jobClass) {
    throw new ForbiddenException();
  }
  return userRow.jobClass;
}

function assertCompletable(questRow: QuestRow, createdOn: string, today: string): void {
  if (today < createdOn) {
    throw new BadRequestException('quest cannot be completed before it was created');
  }
  if (!isDeadlineInPeriod(createdOn, questRow.endsOn, today)) {
    throw new BadRequestException('quest is past its end date');
  }
  if (questRow.completedOn !== null) {
    throw new ConflictException('quest is already completed');
  }
}

async function statusAfterCompletion(tx: DrizzleTx, userId: string): Promise<null> {
  await tx.update(userProgress).set({ statusEffect: null }).where(eq(userProgress.userId, userId));
  return null;
}

async function lockedMarkCount(tx: DrizzleTx, questId: string, userId: string): Promise<number> {
  const [markRow] = await tx
    .select({ markedDayCount: questDayMarks.markedDayCount })
    .from(questDayMarks)
    .where(and(eq(questDayMarks.questId, questId), eq(questDayMarks.userId, userId)))
    .for('update');
  return markRow?.markedDayCount ?? 0;
}

async function reduceBossHp(
  tx: DrizzleTx,
  userId: string,
  bossId: string,
  score: number,
): Promise<void> {
  const [bossRow] = await tx
    .select({ hp: bosses.hp, result: bosses.result })
    .from(bosses)
    .where(and(eq(bosses.id, bossId), eq(bosses.userId, userId)))
    .for('update');
  if (!bossRow || bossRow.result !== null) {
    return;
  }
  const nextHp = Math.max(0, bossRow.hp - score);
  if (nextHp === bossRow.hp) {
    return;
  }
  await tx.update(bosses).set({ hp: nextHp }).where(eq(bosses.id, bossId));
}

async function grantProgress(
  tx: DrizzleTx,
  userId: string,
  gainedXp: number,
  stat: (typeof QUEST_CATEGORY_STATS)[keyof typeof QUEST_CATEGORY_STATS],
): Promise<{
  level: number;
  levelXp: number;
  ticketsGranted: number;
  titlesGranted: number[];
  ticketCount: number;
}> {
  await tx.insert(userProgress).values({ userId }).onConflictDoNothing();

  const [progressRow] = await tx
    .select({
      level: userProgress.level,
      xp: userProgress.xp,
      gachaTicketCount: userProgress.gachaTicketCount,
    })
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .for('update');

  if (!progressRow) {
    throw new InternalServerErrorException('progress row missing after insert');
  }

  const applied = applyLevelXp(progressRow.level, progressRow.xp, gainedXp);
  const ticketCount = progressRow.gachaTicketCount + applied.ticketsGranted;

  await tx
    .update(userProgress)
    .set({
      level: applied.level,
      xp: applied.levelXp,
      gachaTicketCount: ticketCount,
      stamina: sql`${userProgress.stamina} + ${stat === 'stamina' ? gainedXp : 0}`,
      intellect: sql`${userProgress.intellect} + ${stat === 'intellect' ? gainedXp : 0}`,
      sense: sql`${userProgress.sense} + ${stat === 'sense' ? gainedXp : 0}`,
    })
    .where(eq(userProgress.userId, userId));

  let titlesGranted: number[] = [];
  if (applied.titlesGranted.length > 0) {
    const inserted = await tx
      .insert(userTitles)
      .values(applied.titlesGranted.map((levelMark) => ({ userId, levelMark })))
      .onConflictDoNothing()
      .returning({ levelMark: userTitles.levelMark });
    titlesGranted = inserted.map((row) => row.levelMark).toSorted((left, right) => left - right);
  }

  return {
    level: applied.level,
    levelXp: applied.levelXp,
    ticketsGranted: applied.ticketsGranted,
    titlesGranted,
    ticketCount,
  };
}
