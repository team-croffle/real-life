import type { NextFunction, Request, Response } from 'express';

import {
  CONNECTING_IP_HEADER,
  readHeader,
  secretsEqual,
  setRequestClientIp,
  WORKER_KEY_HEADER,
} from './client-ip';
import { isSingleIp, isTrustedPeer } from './trusted-proxies';

export function createClientIpMiddleware(secret: string, trustedProxies: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const providedKey = readHeader(req, WORKER_KEY_HEADER);
    delete req.headers[WORKER_KEY_HEADER];

    const connecting = readHeader(req, CONNECTING_IP_HEADER);
    const fromWorker =
      secretsEqual(secret, providedKey) && connecting !== undefined && isSingleIp(connecting);

    let resolved: string | undefined;
    if (fromWorker) {
      resolved = connecting;
    } else {
      delete req.headers[CONNECTING_IP_HEADER];
      if (!isTrustedPeer(req.socket.remoteAddress, trustedProxies)) {
        delete req.headers['x-forwarded-for'];
        delete req.headers['x-real-ip'];
      }
      resolved = req.ip;
    }

    if (resolved) {
      req.headers[CONNECTING_IP_HEADER] = resolved;
      setRequestClientIp(req, resolved);
    } else {
      delete req.headers[CONNECTING_IP_HEADER];
      setRequestClientIp(req, undefined);
    }

    next();
  };
}
