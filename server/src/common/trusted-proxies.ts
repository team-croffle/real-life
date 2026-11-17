import { isIP } from 'node:net';

export function parseTrustedProxies(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return [];
  }

  return trimmed
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((entry) => {
      if (!isTrustedProxyEntry(entry)) {
        throw new Error(
          `TRUST_PROXY entry "${entry}" is not an IP or CIDR. Use addresses such as 172.30.0.10 or 10.0.0.0/24, not a hop count.`,
        );
      }
      return entry;
    });
}

export function isSingleIp(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && !trimmed.includes(',') && isIP(trimmed) !== 0;
}

export function isTrustedPeer(address: string | undefined, proxies: string[]): boolean {
  if (!address || proxies.length === 0) {
    return false;
  }
  const peerBytes = ipToBytes(normalizePeerAddress(address));
  if (!peerBytes) {
    return false;
  }
  return proxies.some((proxy) => {
    const net = parseCidr(proxy);
    return net !== null && matchesCidr(peerBytes, net);
  });
}

export function normalizePeerAddress(address: string): string {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  return mapped?.[1] ?? address;
}

function isTrustedProxyEntry(entry: string): boolean {
  return parseCidr(entry) !== null;
}

function parseCidr(value: string): { bytes: Uint8Array; prefix: number } | null {
  const slash = value.lastIndexOf('/');
  const ip = slash === -1 ? value : value.slice(0, slash);
  const bytes = ipToBytes(ip);
  if (!bytes) {
    return null;
  }
  const maxBits = bytes.length * 8;
  if (slash === -1) {
    return { bytes, prefix: maxBits };
  }
  const prefixPart = value.slice(slash + 1);
  if (!/^\d+$/.test(prefixPart)) {
    return null;
  }
  const prefix = Number(prefixPart);
  if (prefix > maxBits) {
    return null;
  }
  return { bytes, prefix };
}

function ipToBytes(ip: string): Uint8Array | null {
  const normalized = normalizePeerAddress(ip);
  if (isIP(normalized) === 4) {
    return Uint8Array.from(normalized.split('.').map((octet) => Number(octet)));
  }
  if (isIP(normalized) !== 6) {
    return null;
  }
  const groups = expandIpv6(normalized);
  if (groups.length !== 8) {
    return null;
  }
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 8; i += 1) {
    const group = Number.parseInt(groups[i] ?? '0', 16);
    bytes[i * 2] = (group >> 8) & 0xff;
    bytes[i * 2 + 1] = group & 0xff;
  }
  return bytes;
}

function expandIpv6(ipv6: string): string[] {
  if (ipv6.includes('::')) {
    const sides = ipv6.split('::');
    const left = sides[0] ? sides[0].split(':') : [];
    const right = sides[1] ? sides[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    const zeros = Array.from({ length: missing }, () => '0000');
    return [
      ...left.map((group) => group.padStart(4, '0')),
      ...zeros,
      ...right.map((group) => group.padStart(4, '0')),
    ];
  }
  return ipv6.split(':').map((group) => group.padStart(4, '0'));
}

function matchesCidr(ipBytes: Uint8Array, net: { bytes: Uint8Array; prefix: number }): boolean {
  if (ipBytes.length !== net.bytes.length) {
    return false;
  }
  let bitsRemaining = net.prefix;
  for (let i = 0; i < ipBytes.length && bitsRemaining > 0; i += 1) {
    const take = bitsRemaining >= 8 ? 8 : bitsRemaining;
    const mask = take === 8 ? 0xff : (0xff << (8 - take)) & 0xff;
    if (((ipBytes[i] ?? 0) & mask) !== ((net.bytes[i] ?? 0) & mask)) {
      return false;
    }
    bitsRemaining -= 8;
  }
  return true;
}
