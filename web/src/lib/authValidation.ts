export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8;
}

export function isValidNickname(value: string): boolean {
  const nickname = value.trim();
  return nickname.length >= 1 && nickname.length <= 20 && !nickname.includes('#');
}
