import { timingSafeEqual } from 'node:crypto';

import type { Request } from 'express';

export const CONNECTING_IP_HEADER = 'x-reallife-connecting-ip';
export const WORKER_KEY_HEADER = 'x-reallife-worker-key';

const REQUEST_CLIENT_IP = Symbol('reallifeClientIp');

type RequestWithClientIp = Request & {
  [REQUEST_CLIENT_IP]?: string;
};

export function setRequestClientIp(req: Request, ip: string | undefined): void {
  const request = req as RequestWithClientIp;
  if (ip) {
    request[REQUEST_CLIENT_IP] = ip;
    return;
  }
  delete request[REQUEST_CLIENT_IP];
}

export function getRequestClientIp(req: Request): string | undefined {
  const stored = (req as RequestWithClientIp)[REQUEST_CLIENT_IP];
  if (typeof stored === 'string' && stored.length > 0) {
    return stored;
  }
  return req.ip;
}

export function secretsEqual(expected: string, provided: string | undefined): boolean {
  if (expected.length === 0 || provided === undefined || provided.length === 0) {
    return false;
  }
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  if (expectedBytes.length !== providedBytes.length) {
    return false;
  }
  return timingSafeEqual(expectedBytes, providedBytes);
}

export function readHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}
