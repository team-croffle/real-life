import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const session = await this.auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (role !== 'admin') {
      throw new ForbiddenException('admin required');
    }
    return true;
  }
}
