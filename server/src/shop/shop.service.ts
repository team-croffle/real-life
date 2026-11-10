import type { ShopItem, WalletBalance } from '@nest-vue/shared';
import { SHOP_CATALOG, USER_REWARDS_MAX, isShopKind } from '@nest-vue/shared';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { and, asc, count, eq } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import type { UserRewardRow } from '../database/schema/user-rewards';
import { userRewards } from '../database/schema/user-rewards';
import { users } from '../database/schema/users';
import { WalletService } from '../wallet/wallet.service';
import type { CreateUserRewardDto } from './dto/create-user-reward.dto';
import type { UpdateUserRewardDto } from './dto/update-user-reward.dto';

const REWARD_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ShopService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly walletService: WalletService,
  ) {}

  async list(userId: string): Promise<ShopItem[]> {
    const catalogItems = SHOP_CATALOG.map((item) =>
      toCatalogItem(item.kind, item.name, item.price),
    );
    const rewardRows = await this.db
      .select()
      .from(userRewards)
      .where(eq(userRewards.userId, userId))
      .orderBy(asc(userRewards.createdAt), asc(userRewards.id));
    return [...catalogItems, ...rewardRows.map(toCustomItem)];
  }

  async create(userId: string, dto: CreateUserRewardDto): Promise<ShopItem> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('name must not be empty');
    }

    return this.db.transaction(async (tx) => {
      await lockUser(tx, userId);
      const [countRow] = await tx
        .select({ total: count() })
        .from(userRewards)
        .where(eq(userRewards.userId, userId));
      if (Number(countRow?.total ?? 0) >= USER_REWARDS_MAX) {
        throw new ConflictException('twenty rewards are already registered');
      }
      const [rewardRow] = await tx
        .insert(userRewards)
        .values({
          userId,
          name,
          kind: dto.kind,
          price: dto.price,
        })
        .returning();
      if (!rewardRow) {
        throw new InternalServerErrorException('reward row missing after insert');
      }
      return toCustomItem(rewardRow);
    });
  }

  async update(userId: string, rewardId: string, dto: UpdateUserRewardDto): Promise<ShopItem> {
    assertRewardId(rewardId);
    if (dto.name === undefined && dto.kind === undefined && dto.price === undefined) {
      throw new BadRequestException('reward update is empty');
    }
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('name must not be empty');
    }

    return this.db.transaction(async (tx) => {
      const rewardRow = await lockOwnedReward(tx, userId, rewardId);
      const [saved] = await tx
        .update(userRewards)
        .set({
          name: name ?? rewardRow.name,
          kind: dto.kind ?? rewardRow.kind,
          price: dto.price ?? rewardRow.price,
        })
        .where(eq(userRewards.id, rewardRow.id))
        .returning();
      if (!saved) {
        throw new NotFoundException();
      }
      return toCustomItem(saved);
    });
  }

  async remove(userId: string, rewardId: string): Promise<void> {
    assertRewardId(rewardId);
    await this.db.transaction(async (tx) => {
      const rewardRow = await lockOwnedReward(tx, userId, rewardId);
      await tx.delete(userRewards).where(eq(userRewards.id, rewardRow.id));
    });
  }

  async purchase(userId: string, id: string): Promise<WalletBalance> {
    if (isShopKind(id)) {
      const catalogItem = SHOP_CATALOG.find((item) => item.kind === id);
      if (!catalogItem) {
        throw new NotFoundException();
      }
      return this.db.transaction(async (tx) => {
        const balance = await this.walletService.applyPurchase(
          tx,
          userId,
          catalogItem.price,
          catalogItem.name,
        );
        return { balance };
      });
    }

    assertRewardId(id);
    return this.db.transaction(async (tx) => {
      const rewardRow = await lockOwnedReward(tx, userId, id);
      const balance = await this.walletService.applyPurchase(
        tx,
        userId,
        rewardRow.price,
        rewardRow.name,
      );
      return { balance };
    });
  }
}

function assertRewardId(rewardId: string): void {
  if (!REWARD_ID_PATTERN.test(rewardId)) {
    throw new NotFoundException();
  }
}

function toCatalogItem(kind: ShopItem['kind'], name: string, price: number): ShopItem {
  return { source: 'catalog', id: kind, kind, name, price };
}

function toCustomItem(rewardRow: UserRewardRow): ShopItem {
  return {
    source: 'custom',
    id: rewardRow.id,
    kind: rewardRow.kind,
    name: rewardRow.name,
    price: rewardRow.price,
  };
}

async function lockUser(tx: DrizzleTx, userId: string): Promise<void> {
  const [userRow] = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .for('update');
  if (!userRow) {
    throw new UnauthorizedException();
  }
}

async function lockOwnedReward(
  tx: DrizzleTx,
  userId: string,
  rewardId: string,
): Promise<UserRewardRow> {
  const [rewardRow] = await tx
    .select()
    .from(userRewards)
    .where(and(eq(userRewards.id, rewardId), eq(userRewards.userId, userId)))
    .for('update');
  if (!rewardRow) {
    throw new NotFoundException();
  }
  return rewardRow;
}
