import { APP_TIME_ZONE } from '@nest-vue/shared';

const dateTimeParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((item) => item.type === type)?.value ?? '';
}

/** ISO 시각을 앱 시간대 `YYYY.MM.DD HH:mm`으로 보여 준다. */
export function formatAppDateTime(iso: string): string {
  const parts = dateTimeParts.formatToParts(new Date(iso));
  const hour = part(parts, 'hour') === '24' ? '00' : part(parts, 'hour');
  return `${part(parts, 'year')}.${part(parts, 'month')}.${part(parts, 'day')} ${hour}:${part(parts, 'minute')}`;
}
