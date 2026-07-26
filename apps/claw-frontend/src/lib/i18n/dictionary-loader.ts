import 'server-only';

import { Locale } from '@/enums/locale.enum';
import type { TranslationDictionary } from '@/types/i18n.types';

type DictionaryModule = Record<string, TranslationDictionary>;
type DictionaryLoader = () => Promise<DictionaryModule>;

const dictionaryLoaders: Readonly<Record<Locale, DictionaryLoader>> = {
  [Locale.EN]: () => import('./locales/en'),
  [Locale.AR]: () => import('./locales/ar'),
  [Locale.DE]: () => import('./locales/de'),
  [Locale.ES]: () => import('./locales/es'),
  [Locale.FR]: () => import('./locales/fr'),
  [Locale.HI]: () => import('./locales/hi'),
  [Locale.IT]: () => import('./locales/it'),
  [Locale.PT]: () => import('./locales/pt'),
  [Locale.RU]: () => import('./locales/ru'),
  [Locale.JA]: () => import('./locales/ja'),
  [Locale.TH]: () => import('./locales/th'),
  [Locale.FA]: () => import('./locales/fa'),
  [Locale.ZH]: () => import('./locales/zh'),
};

export async function loadDictionary(locale: Locale): Promise<TranslationDictionary> {
  const module = await dictionaryLoaders[locale]();
  const dictionary = module[locale];
  if (dictionary === undefined) {
    throw new Error(`Dictionary module does not export locale "${locale}"`);
  }
  return dictionary;
}
