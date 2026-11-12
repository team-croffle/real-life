import 'reflect-metadata';
import { API_PREFIX } from '@nest-vue/shared';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { valueOrDevDefault } from './common/value-or-dev-default';

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
  await app.listen(port, '0.0.0.0');

  Logger.log(`Server listening on http://localhost:${port}/${API_PREFIX}`, 'Bootstrap');
}

void bootstrap();
