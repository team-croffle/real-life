const FLOW_KEY = 'real-life:authFlow';

export interface AuthFlowState {
  googleNicknamePrefill: string;
  pendingEmail: string | null;
  justOnboarded: boolean;
}

const EMPTY_FLOW: AuthFlowState = {
  googleNicknamePrefill: '',
  pendingEmail: null,
  justOnboarded: false,
};

export function loadAuthFlow(): AuthFlowState {
  try {
    const raw = globalThis.sessionStorage?.getItem(FLOW_KEY);
    if (!raw) {
      return { ...EMPTY_FLOW };
    }

    const parsed = JSON.parse(raw) as Partial<AuthFlowState>;
    return {
      googleNicknamePrefill:
        typeof parsed.googleNicknamePrefill === 'string' ? parsed.googleNicknamePrefill : '',
      pendingEmail: typeof parsed.pendingEmail === 'string' ? parsed.pendingEmail : null,
      justOnboarded: parsed.justOnboarded === true,
    };
  } catch {
    return { ...EMPTY_FLOW };
  }
}

export function saveAuthFlow(state: AuthFlowState): void {
  globalThis.sessionStorage?.setItem(FLOW_KEY, JSON.stringify(state));
}

export function clearAuthFlow(): void {
  globalThis.sessionStorage?.removeItem(FLOW_KEY);
}
