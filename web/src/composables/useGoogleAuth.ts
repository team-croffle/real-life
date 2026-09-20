const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        ux_mode?: 'popup' | 'redirect';
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          type?: string;
          theme?: string;
          size?: string;
          text?: string;
          width?: number;
          locale?: string;
        },
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing instanceof HTMLScriptElement) {
      if (existing.dataset.loaded === 'true' || window.google?.accounts?.id) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Identity')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    });
    script.addEventListener('error', () => {
      scriptPromise = null;
      reject(new Error('Failed to load Google Identity'));
    });
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function decodeJwtPayload(idToken: string): { given_name?: string; name?: string } {
  const segment = idToken.split('.')[1];
  if (!segment) {
    throw new Error('Invalid Google token');
  }

  const padded = segment.replaceAll('-', '+').replaceAll('_', '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + '='.repeat(padLength);
  const json = decodeURIComponent(
    [...atob(base64)]
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  );

  return JSON.parse(json) as { given_name?: string; name?: string };
}

export function decodeGoogleNickname(idToken: string): string {
  try {
    const payload = decodeJwtPayload(idToken);
    return String(payload.given_name ?? payload.name ?? '')
      .replaceAll('#', '')
      .slice(0, 20)
      .trim();
  } catch {
    return '';
  }
}

export interface GoogleButtonOptions {
  locale: string;
  onCredential: (idToken: string) => void;
}

export function useGoogleAuth() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const available = Boolean(clientId);

  async function mountButton(parent: HTMLElement, options: GoogleButtonOptions): Promise<void> {
    if (!clientId) {
      throw new Error('Google login is not configured');
    }

    await loadGisScript();
    const gis = window.google?.accounts.id;
    if (!gis) {
      throw new Error('Google Identity is unavailable');
    }

    gis.initialize({
      client_id: clientId,
      ux_mode: 'popup',
      callback: (response) => {
        if (response.credential) {
          options.onCredential(response.credential);
        }
      },
    });

    parent.replaceChildren();
    gis.renderButton(parent, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      width: Math.min(parent.clientWidth || 320, 400),
      locale: options.locale,
    });
  }

  return { available, mountButton };
}
