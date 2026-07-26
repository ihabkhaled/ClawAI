import { Locale } from '@claw/shared-types';

export function parseStoredLocale(value: string): Locale {
  const locale = Object.values(Locale).find((candidate) => candidate === value);
  if (locale === undefined) {
    throw new Error('Invalid stored chat-share locale');
  }
  return locale;
}
