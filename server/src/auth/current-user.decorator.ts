import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { RequestAuthUser } from './auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestAuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestAuthUser }>();
    return request.user;
  },
);
