import 'reflect-metadata';
import { API_PREFIX } from '@nest-vue/shared';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type NextFunction, type Request, type Response } from 'express';

import { AppModule } from './app.module';
import { isAllowedAuthHttp } from './auth/allowed-auth-http';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const expressApp = express();
  expressApp.use((req: Request, res: Response, next: NextFunction) => {
    if (!isAllowedAuthHttp(req.method, req.originalUrl)) {
      res.status(404).json({ statusCode: 404, message: 'Not Found' });
      return;
    }
    next();
  });

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bufferLogs: false,
    bodyParser: false,
  });
  const config = app.get(ConfigService);

  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:5173'),
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

  const port = config.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');

  Logger.log(`Server listening on http://localhost:${port}/${API_PREFIX}`, 'Bootstrap');
}

void bootstrap();
