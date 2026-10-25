import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isNotNull } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import { users } from '../database/schema/users';
import { APP_TIME_ZONE } from './quest-calendar';
import { QuestPenaltyService } from './quest-penalty.service';

@Injectable()
export class QuestSettlementScheduler {
  private readonly logger = new Logger(QuestSettlementScheduler.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly questPenaltyService: QuestPenaltyService,
  ) {}

  /** 서울 자정이 지난 직후(00:01) 하루 한 번, 직업을 고른 모든 사용자의 정산을 돌린다. */
  @Cron('0 1 0 * * *', { timeZone: APP_TIME_ZONE, waitForCompletion: true })
  async settleAllUsers(): Promise<void> {
    const userRows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(isNotNull(users.jobClass));

    let failed = 0;
    // 한 사용자가 실패해도 다음 사용자는 계속한다.
    /* oxlint-disable no-await-in-loop */
    for (const { id } of userRows) {
      try {
        await this.questPenaltyService.settle(id);
      } catch (error) {
        failed += 1;
        this.logger.error(
          `settlement failed for user ${id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    /* oxlint-enable no-await-in-loop */

    this.logger.log(`settled ${userRows.length - failed}/${userRows.length} users`);
  }
}
