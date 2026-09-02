import { Test, type TestingModule } from '@nestjs/testing';

import { DRIZZLE } from '../database/database.constants';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService, { provide: DRIZZLE, useValue: { execute: jest.fn() } }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('returns an ok health payload', async () => {
    const result = await controller.check();

    expect(result.data.status).toBe('ok');
    expect(result.data.database).toBe('ok');
  });
});
