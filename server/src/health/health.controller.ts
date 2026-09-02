import type { ApiResponse, HealthCheck } from '@nest-vue/shared';
import { Controller, Get } from '@nestjs/common';

import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(): Promise<ApiResponse<HealthCheck>> {
    return { data: await this.healthService.check() };
  }
}
