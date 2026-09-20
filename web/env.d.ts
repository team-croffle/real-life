/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API 베이스 경로 (기본값: /api, dev 에서는 vite proxy 로 전달) */
  readonly VITE_API_BASE_URL?: string;
  /** dev 서버 프록시 대상 */
  readonly VITE_API_PROXY_TARGET?: string;
  /** dev 서버 포트 */
  readonly VITE_PORT?: string;
  /** Google Identity Services 클라이언트 ID. 서버 GOOGLE_CLIENT_ID 와 같아야 한다. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
