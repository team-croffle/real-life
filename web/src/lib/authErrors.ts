import { ApiError } from '@/composables/useApi';

export function authErrorI18nKey(error: unknown): string {
  if (!(error instanceof ApiError)) {
    if (error instanceof Error) {
      if (
        error.message.includes('not configured') ||
        error.message.includes('Identity is unavailable') ||
        error.message.includes('Failed to load Google')
      ) {
        return 'auth.errors.googleUnavailable';
      }
      if (error.message.includes('cancelled')) {
        return 'auth.errors.googleCancelled';
      }
    }
    return 'auth.errors.generic';
  }

  const message = error.message;

  if (error.status === 409 && message.includes('Email already registered')) {
    return 'auth.errors.emailTaken';
  }

  if (error.status === 409 && message.includes('Social account already registered')) {
    return 'auth.errors.socialTaken';
  }

  if (error.status === 403 && message.includes('Email not verified')) {
    return 'auth.errors.emailNotVerified';
  }

  if (error.status === 503 && message.includes('Session refresh')) {
    return 'auth.errors.generic';
  }

  if (error.status === 503 && message.includes('Google')) {
    return 'auth.errors.googleUnavailable';
  }

  if (error.status === 503) {
    return 'auth.errors.mailUnavailable';
  }

  return 'auth.errors.generic';
}

export function isEmailNotVerified(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    error.message.includes('Email not verified')
  );
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
