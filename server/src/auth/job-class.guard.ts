import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';

import { ALLOW_WITHOUT_JOB_KEY } from './allow-without-job';

@Injectable()
export class JobClassGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowWithoutJob = this.reflector.getAllAndOverride<boolean>(ALLOW_WITHOUT_JOB_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowWithoutJob) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const session = await this.auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) {
      return true;
    }

    const { jobClass } = session.user as { jobClass?: string | null };
    if (!jobClass) {
      throw new ForbiddenException('job class required');
    }
    return true;
  }
}
