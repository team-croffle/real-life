import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';

import { createClientIpMiddleware } from './client-ip.middleware';
import { parseTrustedProxies } from './trusted-proxies';
import { valueOrDevDefault } from './value-or-dev-default';

@Module({})
export class ClientIpModule implements NestModule {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly config: ConfigService,
  ) {}

  configure(_consumer: MiddlewareConsumer): void {
    const secret = valueOrDevDefault(this.config, 'WORKER_CLIENT_IP_SECRET', '');
    const trustedProxies = parseTrustedProxies(this.config.get<string>('TRUST_PROXY', ''));
    this.adapterHost.httpAdapter.use(createClientIpMiddleware(secret, trustedProxies));
  }
}
