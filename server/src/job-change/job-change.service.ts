import type { JobChangeReason, JobChangeResult, JobChangeStatus } from '@nest-vue/shared';
import { JOB_CHANGE_COOLDOWN_DAYS, JOB_CHANGE_EMPLOYMENT_GOLD } from '@nest-vue/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import { userProgress } from '../database/schema/user-progress';
import { users } from '../database/schema/users';
import { WalletService } from '../wallet/wallet.service';
import type { ChangeJobClassDto } from './dto/change-job-class.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class JobChangeService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly wallet: WalletService,
  ) {}

  async status(userId: string): Promise<JobChangeStatus> {
    const [userRow] = await this.db
      .select({
        jobClass: users.jobClass,
        jobClassChangedAt: users.jobClassChangedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRow) {
      throw new UnauthorizedException();
    }
    if (!userRow.jobClass) {
      throw new ForbiddenException('job class required');
    }

    return {
      jobClass: userRow.jobClass,
      jobClassChangedAt: userRow.jobClassChangedAt?.toISOString() ?? null,
      nextJobChangeAt: userRow.jobClassChangedAt
        ? nextJobChangeAt(userRow.jobClassChangedAt).toISOString()
        : null,
    };
  }

  async change(userId: string, dto: ChangeJobClassDto): Promise<JobChangeResult> {
    const reason = dto.reason ?? 'none';

    return this.db.transaction(async (tx) => {
      const userRow = await lockedUser(tx, userId);
      if (userRow.jobClass === dto.jobClass) {
        throw new BadRequestException('job class is unchanged');
      }

      const now = new Date();
      if (userRow.jobClassChangedAt) {
        const nextAt = nextJobChangeAt(userRow.jobClassChangedAt);
        if (now.getTime() < nextAt.getTime()) {
          throw new ConflictException('job class change is on cooldown');
        }
      }

      await tx
        .update(users)
        .set({ jobClass: dto.jobClass, jobClassChangedAt: now })
        .where(eq(users.id, userId));

      await resetLevelXp(tx, userId);
      const goldGranted = await grantForReason(tx, this.wallet, userId, reason);

      return {
        jobClass: dto.jobClass,
        reason,
        level: 1,
        xp: 0,
        goldGranted,
        jobClassChangedAt: now.toISOString(),
        nextJobChangeAt: nextJobChangeAt(now).toISOString(),
      };
    });
  }
}

function nextJobChangeAt(changedAt: Date): Date {
  return new Date(changedAt.getTime() + JOB_CHANGE_COOLDOWN_DAYS * DAY_MS);
}

async function lockedUser(tx: DrizzleTx, userId: string) {
  const [userRow] = await tx
    .select({
      jobClass: users.jobClass,
      jobClassChangedAt: users.jobClassChangedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .for('update');

  if (!userRow) {
    throw new UnauthorizedException();
  }
  if (!userRow.jobClass) {
    throw new ForbiddenException('job class required');
  }
  return userRow;
}

async function resetLevelXp(tx: DrizzleTx, userId: string): Promise<void> {
  await tx.insert(userProgress).values({ userId }).onConflictDoNothing();

  const [progressRow] = await tx
    .select({ userId: userProgress.userId })
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .for('update');

  if (!progressRow) {
    throw new InternalServerErrorException('progress row missing after insert');
  }

  await tx.update(userProgress).set({ level: 1, xp: 0 }).where(eq(userProgress.userId, userId));
}

async function grantForReason(
  tx: DrizzleTx,
  wallet: WalletService,
  userId: string,
  reason: JobChangeReason,
): Promise<number> {
  if (reason === 'employment') {
    await wallet.applyBalanceDelta(tx, userId, JOB_CHANGE_EMPLOYMENT_GOLD);
    return JOB_CHANGE_EMPLOYMENT_GOLD;
  }
  if (reason === 'unemployment') {
    grantUnemploymentTitle();
  }
  return 0;
}

function grantUnemploymentTitle(): void {
  // 칭호 이름과 저장 방식은 아직 없다. 정하는 시점에 여기서 테이블에 넣는다.
}
