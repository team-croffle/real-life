import 'reflect-metadata';
import { API_PREFIX } from '@nest-vue/shared';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', '*'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = config.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');

  Logger.log(`Server listening on http://localhost:${port}/${API_PREFIX}`, 'Bootstrap');
}

void bootstrap();
