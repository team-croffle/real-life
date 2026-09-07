export const AUTH_PROVIDERS = ['google'] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];
