import { Locale } from '@/enums/locale.enum';
import type { ThreadsMarketingDictionary } from '@/types/threads-marketing-content.types';

import { AR_THREADS_MARKETING_CONTENT } from './threads-marketing-content/ar.constants';
import { DE_THREADS_MARKETING_CONTENT } from './threads-marketing-content/de.constants';
import { EN_THREADS_MARKETING_CONTENT } from './threads-marketing-content/en.constants';
import { ES_THREADS_MARKETING_CONTENT } from './threads-marketing-content/es.constants';
import { FA_THREADS_MARKETING_CONTENT } from './threads-marketing-content/fa.constants';
import { FR_THREADS_MARKETING_CONTENT } from './threads-marketing-content/fr.constants';
import { HI_THREADS_MARKETING_CONTENT } from './threads-marketing-content/hi.constants';
import { IT_THREADS_MARKETING_CONTENT } from './threads-marketing-content/it.constants';
import { JA_THREADS_MARKETING_CONTENT } from './threads-marketing-content/ja.constants';
import { PT_THREADS_MARKETING_CONTENT } from './threads-marketing-content/pt.constants';
import { RU_THREADS_MARKETING_CONTENT } from './threads-marketing-content/ru.constants';
import { TH_THREADS_MARKETING_CONTENT } from './threads-marketing-content/th.constants';
import { ZH_THREADS_MARKETING_CONTENT } from './threads-marketing-content/zh.constants';

/**
 * Threads page copy, translated per locale.
 *
 * Same rule as the Coding Agent and comparison pages: a page earns its place in a locale's
 * sitemap only if a reader of that language can read it.
 */
export const THREADS_MARKETING_CONTENT_BY_LOCALE: Record<Locale, ThreadsMarketingDictionary> = {
  [Locale.EN]: EN_THREADS_MARKETING_CONTENT,
  [Locale.AR]: AR_THREADS_MARKETING_CONTENT,
  [Locale.FR]: FR_THREADS_MARKETING_CONTENT,
  [Locale.IT]: IT_THREADS_MARKETING_CONTENT,
  [Locale.DE]: DE_THREADS_MARKETING_CONTENT,
  [Locale.ES]: ES_THREADS_MARKETING_CONTENT,
  [Locale.RU]: RU_THREADS_MARKETING_CONTENT,
  [Locale.PT]: PT_THREADS_MARKETING_CONTENT,
  [Locale.HI]: HI_THREADS_MARKETING_CONTENT,
  [Locale.JA]: JA_THREADS_MARKETING_CONTENT,
  [Locale.TH]: TH_THREADS_MARKETING_CONTENT,
  [Locale.FA]: FA_THREADS_MARKETING_CONTENT,
  [Locale.ZH]: ZH_THREADS_MARKETING_CONTENT,
};
