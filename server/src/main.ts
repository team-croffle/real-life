import 'reflect-metadata';
import { API_PREFIX } from '@nest-vue/shared';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { Pool } from 'pg';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { valueOrDevDefault } from './common/value-or-dev-default';
import { PG_POOL } from './database/database.constants';
import { applyMigrations } from './database/migrate';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: false,
    bodyParser: false,
  });
  const config = app.get(ConfigService);
  const corsOrigin = valueOrDevDefault(config, 'CORS_ORIGIN', 'http://localhost:5173');

  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const trustProxy = config.get<string>('TRUST_PROXY', '').trim();
  const proxyHops = Number.parseInt(trustProxy, 10);
  if (/^\d+$/.test(trustProxy) && proxyHops > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', proxyHops);
  }

  const port = config.get<number>('PORT', 3000);
  try {
    await applyMigrations(app.get<Pool>(PG_POOL));
  } catch (error) {
    Logger.error(
      error instanceof Error ? (error.stack ?? error.message) : String(error),
      'Bootstrap',
    );
    await app.close();
    process.exit(1);
  }

  await app.listen(port, '0.0.0.0');

  Logger.log(`Server listening on http://localhost:${port}/${API_PREFIX}`, 'Bootstrap');
}

void bootstrap();
