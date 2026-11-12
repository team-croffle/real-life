import type { ConfigService } from '@nestjs/config';

export function valueOrDevDefault(config: ConfigService, key: string, devDefault: string): string {
  const value = config.get<string>(key)?.trim() ?? '';
  if (config.get<string>('NODE_ENV') === 'production' && value === '') {
    throw new Error(`${key} is required when NODE_ENV=production`);
  }
  return value || devDefault;
}
