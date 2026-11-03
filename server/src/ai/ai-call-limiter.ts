import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const AI_DIRECT_CALLS_PER_MINUTE_DEFAULT = 3;

const WINDOW_MS = 60_000;

@Injectable()
export class AiCallLimiter {
  private readonly calledAt: number[] = [];

  constructor(private readonly config: ConfigService) {}

  /** 최근 1분이 한도 미만이면 시각을 남기고 true. 기다리지 않는다. */
  tryAcquire(): boolean {
    const now = Date.now();
    const fresh = this.calledAt.filter((at) => now - at < WINDOW_MS);
    this.calledAt.length = 0;
    this.calledAt.push(...fresh);
    if (this.calledAt.length >= this.perMinute()) {
      return false;
    }
    this.calledAt.push(now);
    return true;
  }

  private perMinute(): number {
    const raw = this.config.get<string | number>(
      'AI_DIRECT_CALLS_PER_MINUTE',
      AI_DIRECT_CALLS_PER_MINUTE_DEFAULT,
    );
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return AI_DIRECT_CALLS_PER_MINUTE_DEFAULT;
    }
    return parsed;
  }
}
