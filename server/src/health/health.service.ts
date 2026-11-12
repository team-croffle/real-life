import type { HealthCheck, HealthStatus } from '@nest-vue/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async check(): Promise<HealthCheck> {
    const database = await this.checkDatabase();

    return {
      status: database === 'ok' ? 'ok' : 'degraded',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database,
    };
  }

  private async checkDatabase(): Promise<HealthStatus> {
    try {
      await this.db.execute(sql`select 1`);
      return 'ok';
    } catch (error) {
      this.logger.warn(`Database health check failed: ${String(error)}`);
      return 'down';
    }
  }
}
