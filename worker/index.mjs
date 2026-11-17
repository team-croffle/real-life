const DEFAULT_API_ORIGIN = 'https://api.reallife.croffledev.kr';
const CONNECTING_IP_HEADER = 'x-reallife-connecting-ip';
const WORKER_KEY_HEADER = 'x-reallife-worker-key';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      applyApiOrigin(url, env.API_ORIGIN || DEFAULT_API_ORIGIN);
      const forwarded = new Request(url, request);
      const headers = new Headers(forwarded.headers);
      const secret =
        typeof env.WORKER_CLIENT_IP_SECRET === 'string' ? env.WORKER_CLIENT_IP_SECRET.trim() : '';
      const connectingIp = request.headers.get('CF-Connecting-IP');
      if (secret && connectingIp) {
        headers.set(CONNECTING_IP_HEADER, connectingIp);
        headers.set(WORKER_KEY_HEADER, secret);
      }
      return fetch(new Request(forwarded, { headers }), { redirect: 'manual' });
    }
    return env.ASSETS.fetch(request);
  },
};

function applyApiOrigin(url, origin) {
  const target = new URL(origin);
  url.protocol = target.protocol;
  url.hostname = target.hostname;
  url.port = target.port;
}
