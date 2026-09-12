import { API_PREFIX } from '@nest-vue/shared';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { DRIZZLE } from '../src/database/database.constants';
import { HealthModule } from '../src/health/health.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(DRIZZLE)
      .useValue({ execute: () => Promise.resolve([]) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it(`GET /${API_PREFIX}/health`, async () => {
    const response = await request(app.getHttpServer()).get(`/${API_PREFIX}/health`).expect(200);

    expect(response.body.status).toBe('ok');
  });
});
