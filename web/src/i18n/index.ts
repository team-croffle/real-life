import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from '@nest-vue/shared';
import { createI18n } from 'vue-i18n';

import en from './locales/en.json';
import ko from './locales/ko.json';

export const LOCALE_STORAGE_KEY = 'real-life:locale';
const LEGACY_LOCALE_STORAGE_KEY = 'nest-vue:locale';

function isSupported(value: string | null | undefined): value is SupportedLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function resolveInitialLocale(): SupportedLocale {
  const stored = globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY);
  if (isSupported(stored)) {
    return stored;
  }

  const legacy = globalThis.localStorage?.getItem(LEGACY_LOCALE_STORAGE_KEY);
  if (isSupported(legacy)) {
    globalThis.localStorage.setItem(LOCALE_STORAGE_KEY, legacy);
    globalThis.localStorage.removeItem(LEGACY_LOCALE_STORAGE_KEY);
    return legacy;
  }

  return DEFAULT_LOCALE;
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: resolveInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: { ko, en },
});

document.documentElement.lang = String(i18n.global.locale.value);

export function setLocale(locale: SupportedLocale): void {
  i18n.global.locale.value = locale;
  globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, locale);
  document.documentElement.lang = locale;
}
