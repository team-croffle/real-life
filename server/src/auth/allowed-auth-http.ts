const AUTH_PREFIX = '/api/auth';

const ALLOWED_AUTH_HTTP = new Set([
  'GET /get-session',
  'POST /sign-in/email',
  'POST /sign-in/social',
  'POST /sign-out',
  'GET /verify-email',
]);

export function isAllowedAuthHttp(method: string, path: string): boolean {
  if (method.toUpperCase() === 'OPTIONS') {
    return true;
  }

  const pathname = (path.split('?')[0] ?? path).replace(/\/+/g, '/');
  const normalized = pathname.replace(/\/$/, '').toLowerCase() || '/';
  if (!normalized.startsWith(AUTH_PREFIX)) {
    return true;
  }

  const rest = normalized.slice(AUTH_PREFIX.length) || '/';
  const key = `${method.toUpperCase()} ${rest.startsWith('/') ? rest : `/${rest}`}`;
  return ALLOWED_AUTH_HTTP.has(key);
}
