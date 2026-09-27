import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

const EMAIL_LIMIT = 1;
const EMAIL_WINDOW_MS = 60 * 1000;
const IP_LIMIT = 10;
const IP_WINDOW_MS = 10 * 60 * 1000;

/** 인증 메일을 보내는 엔드포인트에 붙인다. 프로세스 메모리에만 기록하므로 인스턴스마다 따로 센다. */
@Injectable()
export class MailSendLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();
  private sweptAt = Date.now();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const body = req.body as { email?: unknown } | undefined;
    // 본문 검증은 파이프에서 하므로 여기서는 길이만 보고 키로 쓴다.
    const email =
      typeof body?.email === 'string' && body.email.length <= 254 ? body.email.toLowerCase() : null;

    this.sweep();
    if (req.ip) {
      this.take(`ip:${req.ip}`, IP_LIMIT, IP_WINDOW_MS);
    }
    if (email) {
      this.take(`email:${email}`, EMAIL_LIMIT, EMAIL_WINDOW_MS);
    }
    return true;
  }

  private take(key: string, limit: number, windowMs: number): void {
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((at) => now - at < windowMs);
    this.hits.set(key, recent);

    if (recent.length >= limit) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    recent.push(now);
  }

  private sweep(): void {
    const now = Date.now();
    if (now - this.sweptAt < IP_WINDOW_MS) {
      return;
    }
    this.sweptAt = now;
    for (const [key, times] of this.hits) {
      if (times.every((at) => now - at >= IP_WINDOW_MS)) {
        this.hits.delete(key);
      }
    }
  }
}
