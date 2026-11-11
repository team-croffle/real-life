import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const EMAIL_LIMIT = 1;
const EMAIL_WINDOW_MS = 60 * 1000;
const IP_LIMIT = 10;
const IP_WINDOW_MS = 10 * 60 * 1000;

export type MailSendReservation = {
  emailKey: string;
  emailAt: number;
  ipKey?: string;
  ipAt?: number;
};

/** 인증 메일을 보내기 전에 자리를 잡는다. 프로세스 메모리에만 기록하므로 인스턴스마다 따로 센다. */
@Injectable()
export class MailSendLimiter {
  private readonly hits = new Map<string, number[]>();
  private sweptAt = Date.now();

  tryReserve(email: string, ip: string | undefined): MailSendReservation {
    this.sweep();
    const now = Date.now();
    const emailKey = `email:${email.toLowerCase()}`;
    const ipKey = ip ? `ip:${ip}` : undefined;
    if (this.wouldExceed(emailKey, EMAIL_LIMIT, EMAIL_WINDOW_MS, now)) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (ipKey && this.wouldExceed(ipKey, IP_LIMIT, IP_WINDOW_MS, now)) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.push(emailKey, now);
    if (ipKey) {
      this.push(ipKey, now);
    }
    return { emailKey, emailAt: now, ipKey, ipAt: ipKey ? now : undefined };
  }

  release(reservation: MailSendReservation): void {
    this.remove(reservation.emailKey, reservation.emailAt);
    if (reservation.ipKey !== undefined && reservation.ipAt !== undefined) {
      this.remove(reservation.ipKey, reservation.ipAt);
    }
  }

  private wouldExceed(key: string, limit: number, windowMs: number, now: number): boolean {
    const recent = (this.hits.get(key) ?? []).filter((at) => now - at < windowMs);
    this.hits.set(key, recent);
    return recent.length >= limit;
  }

  private push(key: string, at: number): void {
    const recent = this.hits.get(key) ?? [];
    recent.push(at);
    this.hits.set(key, recent);
  }

  private remove(key: string, at: number): void {
    const recent = this.hits.get(key);
    if (!recent) {
      return;
    }
    const index = recent.indexOf(at);
    if (index >= 0) {
      recent.splice(index, 1);
    }
    if (recent.length === 0) {
      this.hits.delete(key);
    }
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
