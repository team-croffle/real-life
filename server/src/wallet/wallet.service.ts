import type { Paginated, WalletBalance, WalletEntry } from '@nest-vue/shared';
import { WALLET_DEBT_LIMIT } from '@nest-vue/shared';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { count, desc, eq } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import { walletEntries, wallets } from '../database/schema/wallets';
import type { CreatePostHocDeductionDto } from './dto/create-post-hoc-deduction.dto';
import type { ListWalletEntriesQueryDto } from './dto/list-wallet-entries-query.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

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
      await tx.insert(wallets).values({ userId }).onConflictDoNothing();

      const [walletRow] = await tx
        .select({ balance: wallets.balance })
        .from(wallets)
        .where(eq(wallets.userId, userId))
        .for('update');

      if (!walletRow) {
        throw new InternalServerErrorException('wallet row missing after insert');
      }

      const nextBalance = walletRow.balance - dto.amount;
      if (nextBalance < -WALLET_DEBT_LIMIT) {
        throw new BadRequestException('deduction would exceed the debt limit');
      }

      await tx.insert(walletEntries).values({
        userId,
        amount: -dto.amount,
      });

      await tx.update(wallets).set({ balance: nextBalance }).where(eq(wallets.userId, userId));

      return { balance: nextBalance };
    });
  }
}
