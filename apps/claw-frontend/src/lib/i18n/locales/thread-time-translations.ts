import { Locale } from '@/enums/locale.enum';
import type { ThreadTimeLocaleTranslation } from '@/types/i18n.types';

/**
 * The one relative-time phrase `Intl.RelativeTimeFormat` cannot give us ("just now": it says
 * "now" or "in 0 seconds"). Every other label ("20 minutes ago", "yesterday") comes from Intl in
 * the visitor's locale. One file imported by every locale, so a missing locale is a type error.
 */
export const THREAD_TIME_TRANSLATIONS: Record<Locale, ThreadTimeLocaleTranslation> = {
  [Locale.EN]: { justNow: 'just now' },
  [Locale.AR]: { justNow: 'الآن' },
  [Locale.DE]: { justNow: 'gerade eben' },
  [Locale.ES]: { justNow: 'ahora mismo' },
  [Locale.FA]: { justNow: 'همین الان' },
  [Locale.FR]: { justNow: "à l'instant" },
  [Locale.HI]: { justNow: 'अभी-अभी' },
  [Locale.IT]: { justNow: 'proprio ora' },
  [Locale.JA]: { justNow: 'たった今' },
  [Locale.PT]: { justNow: 'agora mesmo' },
  [Locale.RU]: { justNow: 'только что' },
  [Locale.TH]: { justNow: 'เมื่อสักครู่' },
  [Locale.ZH]: { justNow: '刚刚' },
};
