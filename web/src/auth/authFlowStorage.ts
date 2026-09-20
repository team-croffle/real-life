const FLOW_KEY = 'real-life:authFlow';

export interface EmailRegisterDraft {
  nickname: string;
  email: string;
  password: string;
}

export interface AuthFlowState {
  emailDraft: EmailRegisterDraft | null;
  googleOnboardingToken: string | null;
  googleNicknamePrefill: string;
  pendingEmail: string | null;
  devVerifyToken: string | null;
  justOnboarded: boolean;
}

const EMPTY_FLOW: AuthFlowState = {
  emailDraft: null,
  googleOnboardingToken: null,
  googleNicknamePrefill: '',
  pendingEmail: null,
  devVerifyToken: null,
  justOnboarded: false,
};

function isDraft(value: unknown): value is EmailRegisterDraft {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const draft = value as EmailRegisterDraft;
  return typeof draft.nickname === 'string' && typeof draft.email === 'string';
}

export function loadAuthFlow(): AuthFlowState {
  try {
    const raw = globalThis.sessionStorage?.getItem(FLOW_KEY);
    if (!raw) {
      return { ...EMPTY_FLOW };
    }

    const parsed = JSON.parse(raw) as Partial<AuthFlowState>;
    return {
      emailDraft: isDraft(parsed.emailDraft)
        ? {
            nickname: parsed.emailDraft.nickname,
            email: parsed.emailDraft.email,
            password: '',
          }
        : null,
      googleOnboardingToken:
        typeof parsed.googleOnboardingToken === 'string' ? parsed.googleOnboardingToken : null,
      googleNicknamePrefill:
        typeof parsed.googleNicknamePrefill === 'string' ? parsed.googleNicknamePrefill : '',
      pendingEmail: typeof parsed.pendingEmail === 'string' ? parsed.pendingEmail : null,
      devVerifyToken: typeof parsed.devVerifyToken === 'string' ? parsed.devVerifyToken : null,
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
