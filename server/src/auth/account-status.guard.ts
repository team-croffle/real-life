import { accountSuspendedBody, isAccountSuspended } from '@nest-vue/shared';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';

type SessionUserStatus = {
  suspended?: boolean;
  suspendedUntil?: Date | string | null;
  suspendReason?: string | null;
};

@Injectable()
export class AccountStatusGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const session = await this.auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) {
      return true;
    }

    const user = session.user as SessionUserStatus;
    const suspendedUntil = user.suspendedUntil ?? null;
    const suspendReason = user.suspendReason ?? null;
    if (
      !isAccountSuspended({
        suspended: Boolean(user.suspended),
        suspendedUntil,
      })
    ) {
      return true;
    }

    throw new ForbiddenException(accountSuspendedBody({ suspendedUntil, suspendReason }));
  }
}
