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

function hourOf(parts: Intl.DateTimeFormatPart[]): string {
  const hour = part(parts, 'hour');
  return hour === '24' ? '00' : hour;
}

/** ISO 시각을 앱 시간대 `YYYY.MM.DD HH:mm`으로 보여 준다. */
export function formatAppDateTime(iso: string): string {
  const parts = dateTimeParts.formatToParts(new Date(iso));
  return `${part(parts, 'year')}.${part(parts, 'month')}.${part(parts, 'day')} ${hourOf(parts)}:${part(parts, 'minute')}`;
}

/** ISO 시각을 앱 시간대 `YYYY.MM.DD`로 보여 준다. */
export function formatAppDate(iso: string): string {
  const parts = dateTimeParts.formatToParts(new Date(iso));
  return `${part(parts, 'year')}.${part(parts, 'month')}.${part(parts, 'day')}`;
}

/** ISO 시각을 `datetime-local` 값(앱 시간대 벽시계)으로 바꾼다. */
export function toAppDateTimeLocal(iso: string): string {
  const parts = dateTimeParts.formatToParts(new Date(iso));
  return `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}T${hourOf(parts)}:${part(parts, 'minute')}`;
}

/** `datetime-local` 값(앱 시간대 벽시계)을 ISO로 바꾼다. */
export function fromAppDateTimeLocal(value: string): string {
  const matched = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!matched) {
    throw new Error('invalid datetime-local');
  }
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const hour = Number(matched[4]);
  const minute = Number(matched[5]);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  let utc = wall;
  for (let i = 0; i < 2; i += 1) {
    const parts = dateTimeParts.formatToParts(new Date(utc));
    const asUtc = Date.UTC(
      Number(part(parts, 'year')),
      Number(part(parts, 'month')) - 1,
      Number(part(parts, 'day')),
      Number(hourOf(parts)),
      Number(part(parts, 'minute')),
    );
    utc += wall - asUtc;
  }
  return new Date(utc).toISOString();
}
