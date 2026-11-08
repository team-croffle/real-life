import type { Paginated, WalletBalance, WalletEntry, WalletEntryKind } from '@nest-vue/shared';
import { WALLET_DEBT_LIMIT, appliedGoldPenalty } from '@nest-vue/shared';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { count, desc, eq } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import { walletEntries, wallets } from '../database/schema/wallets';
import type { CreatePostHocDeductionDto } from './dto/create-post-hoc-deduction.dto';
import type { ListWalletEntriesQueryDto } from './dto/list-wallet-entries-query.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

/** 퀘스트와 보스 중 하나만 가리키거나, 둘 다 비운다. */
export type WalletEntryCause = {
  questId: string | null;
  bossId: string | null;
};

@Injectable()
export class WalletService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async getBalance(userId: string): Promise<WalletBalance> {
    const [walletRow] = await this.db
      .select({ balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.userId, userId));

    return { balance: walletRow?.balance ?? 0 };
  }

  async listEntries(
    userId: string,
    query: ListWalletEntriesQueryDto,
  ): Promise<Paginated<WalletEntry>> {
    const page = query.page ?? DEFAULT_PAGE;
    const size = query.size ?? DEFAULT_PAGE_SIZE;
    const where = eq(walletEntries.userId, userId);

    const [countRow] = await this.db.select({ total: count() }).from(walletEntries).where(where);
    const total = Number(countRow?.total ?? 0);

    const entryRows = await this.db
      .select({
        id: walletEntries.id,
        amount: walletEntries.amount,
        tickets: walletEntries.tickets,
        kind: walletEntries.kind,
        questId: walletEntries.questId,
        bossId: walletEntries.bossId,
        createdAt: walletEntries.createdAt,
      })
      .from(walletEntries)
      .where(where)
      .orderBy(desc(walletEntries.createdAt))
      .limit(size)
      .offset((page - 1) * size);

    return {
      items: entryRows.map((entryRow) => ({
        id: entryRow.id,
        amount: entryRow.amount,
        tickets: entryRow.tickets,
        kind: entryRow.kind,
        questId: entryRow.questId,
        bossId: entryRow.bossId,
        createdAt: entryRow.createdAt.toISOString(),
      })),
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    };
  }

  async createPostHocDeduction(
    userId: string,
    dto: CreatePostHocDeductionDto,
  ): Promise<WalletBalance> {
    return this.db.transaction(async (tx) => {
      const balance = await this.applyBalanceDelta(tx, userId, -dto.amount, 'post_hoc_deduction', {
        questId: null,
        bossId: null,
        tickets: 0,
      });
      return { balance };
    });
  }

  async applyBalanceDelta(
    tx: DrizzleTx,
    userId: string,
    amount: number,
    kind: WalletEntryKind,
    cause: WalletEntryCause & { tickets: number },
  ): Promise<number> {
    await tx.insert(wallets).values({ userId }).onConflictDoNothing();

    const [walletRow] = await tx
      .select({ balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .for('update');

    if (!walletRow) {
      throw new InternalServerErrorException('wallet row missing after insert');
    }

    if (amount === 0 && cause.tickets === 0) {
      return walletRow.balance;
    }

    const nextBalance = walletRow.balance + amount;
    if (amount < 0 && nextBalance < -WALLET_DEBT_LIMIT) {
      throw new BadRequestException('deduction would exceed the debt limit');
    }

    await tx.insert(walletEntries).values({
      userId,
      amount,
      tickets: cause.tickets,
      kind,
      questId: cause.questId,
      bossId: cause.bossId,
    });
    if (amount !== 0) {
      await tx.update(wallets).set({ balance: nextBalance }).where(eq(wallets.userId, userId));
    }
    return amount === 0 ? walletRow.balance : nextBalance;
  }

  /** 외상 한도까지만 깎는다. 적용액이 0이면 내역을 넣지 않고 잔액도 바꾸지 않는다. */
  async applyClampedPenalty(
    tx: DrizzleTx,
    userId: string,
    loss: number,
    cause: WalletEntryCause,
    kind: WalletEntryKind = 'penalty',
  ): Promise<{ balance: number; applied: number }> {
    await tx.insert(wallets).values({ userId }).onConflictDoNothing();

    const [walletRow] = await tx
      .select({ balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .for('update');

    if (!walletRow) {
      throw new InternalServerErrorException('wallet row missing after insert');
    }

    const applied = appliedGoldPenalty(walletRow.balance, loss);
    if (applied === 0) {
      return { balance: walletRow.balance, applied: 0 };
    }

    const nextBalance = walletRow.balance - applied;
    await tx.insert(walletEntries).values({
      userId,
      amount: -applied,
      tickets: 0,
      kind,
      questId: cause.questId,
      bossId: cause.bossId,
    });
    await tx.update(wallets).set({ balance: nextBalance }).where(eq(wallets.userId, userId));
    return { balance: nextBalance, applied };
  }
}
