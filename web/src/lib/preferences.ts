/**
 * 이 브라우저에만 저장하는 화면 설정. 계정과 상관없이 기기마다 따로 둔다.
 * 저장소가 막힌 브라우저(시크릿 창 등)에서는 기본값으로 동작한다.
 */

export type Theme = 'light' | 'dark';

/** index.html의 테마 스크립트도 같은 키를 읽는다. 바꾸면 두 곳을 같이 바꾼다. */
const THEME_KEY = 'reallife.theme';
const SOUND_ON_KEY = 'reallife.soundOn';
const VOLUME_KEY = 'reallife.volume';

export const DEFAULT_VOLUME = 70;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장이 막혀 있으면 이번 접속 동안만 적용된다.
  }
}

/** 고른 적이 없으면 OS 설정을 따른다. */
export function getTheme(): Theme {
  const saved = read(THEME_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function setTheme(theme: Theme): void {
  write(THEME_KEY, theme);
  applyTheme(theme);
}

/** 저장된 값이 없으면 효과음은 켜져 있다. */
export function getSoundOn(): boolean {
  return read(SOUND_ON_KEY) !== 'false';
}

export function setSoundOn(on: boolean): void {
  write(SOUND_ON_KEY, String(on));
}

/** 0~100. 저장된 값이 없거나 잘못됐으면 기본 음량이다. */
export function getVolume(): number {
  const saved = read(VOLUME_KEY);
  const volume = saved === null ? Number.NaN : Number(saved);
  if (Number.isNaN(volume)) {
    return DEFAULT_VOLUME;
  }
  return Math.min(100, Math.max(0, Math.round(volume)));
}

export function setVolume(volume: number): void {
  write(VOLUME_KEY, String(Math.min(100, Math.max(0, Math.round(volume)))));
}
