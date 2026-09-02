import { Global, Inject, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { DRIZZLE, PG_POOL } from './database.constants';
import * as schema from './schema';

export type DrizzleDb = ReturnType<typeof createDrizzle>;

function createDrizzle(pool: Pool) {
  return drizzle(pool, { schema, casing: 'snake_case' });
}

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Pool =>
        new Pool({
          connectionString: config.getOrThrow<string>('DATABASE_URL'),
          max: config.get<number>('DATABASE_POOL_MAX', 10),
        }),
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool): DrizzleDb => createDrizzle(pool),
    },
  ],
  exports: [DRIZZLE, PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
    this.logger.log('Postgres pool closed');
  }
}
