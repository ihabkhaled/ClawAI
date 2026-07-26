import { Locale } from '@/enums/locale.enum';

export const HTML_LANGUAGE_BY_LOCALE: Readonly<Record<Locale, string>> = {
  [Locale.EN]: 'en',
  [Locale.AR]: 'ar',
  [Locale.DE]: 'de',
  [Locale.ES]: 'es',
  [Locale.FR]: 'fr',
  [Locale.HI]: 'hi',
  [Locale.IT]: 'it',
  [Locale.PT]: 'pt',
  [Locale.RU]: 'ru',
  [Locale.JA]: 'ja',
  [Locale.TH]: 'th',
  [Locale.FA]: 'fa',
  [Locale.ZH]: 'zh-Hans',
};

export const OPEN_GRAPH_LOCALE_BY_LOCALE: Readonly<Record<Locale, string>> = {
  [Locale.EN]: 'en_US',
  [Locale.AR]: 'ar_AR',
  [Locale.DE]: 'de_DE',
  [Locale.ES]: 'es_ES',
  [Locale.FR]: 'fr_FR',
  [Locale.HI]: 'hi_IN',
  [Locale.IT]: 'it_IT',
  [Locale.PT]: 'pt_PT',
  [Locale.RU]: 'ru_RU',
  [Locale.JA]: 'ja_JP',
  [Locale.TH]: 'th_TH',
  [Locale.FA]: 'fa_IR',
  [Locale.ZH]: 'zh_CN',
};
