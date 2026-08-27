import { Locale } from '@/enums/locale.enum';
import type { ComparisonDictionary } from '@/types/public-comparison.types';

import { AR_COMPARISON_CONTENT } from './public-comparison-content/ar.constants';
import { DE_COMPARISON_CONTENT } from './public-comparison-content/de.constants';
import { EN_COMPARISON_CONTENT } from './public-comparison-content/en.constants';
import { ES_COMPARISON_CONTENT } from './public-comparison-content/es.constants';
import { FA_COMPARISON_CONTENT } from './public-comparison-content/fa.constants';
import { FR_COMPARISON_CONTENT } from './public-comparison-content/fr.constants';
import { HI_COMPARISON_CONTENT } from './public-comparison-content/hi.constants';
import { IT_COMPARISON_CONTENT } from './public-comparison-content/it.constants';
import { JA_COMPARISON_CONTENT } from './public-comparison-content/ja.constants';
import { PT_COMPARISON_CONTENT } from './public-comparison-content/pt.constants';
import { RU_COMPARISON_CONTENT } from './public-comparison-content/ru.constants';
import { TH_COMPARISON_CONTENT } from './public-comparison-content/th.constants';
import { ZH_COMPARISON_CONTENT } from './public-comparison-content/zh.constants';

/**
 * Comparison copy, translated per locale.
 *
 * Deliberately NOT English-for-everyone. A comparison page only earns its place
 * in a locale's sitemap if a reader of that language can actually read it —
 * `getIndexablePagesForLocale` will happily list a URL whose body is English,
 * and a thin or wrong-language page is worse for discovery than no page.
 */
export const COMPARISON_CONTENT_BY_LOCALE: Record<Locale, ComparisonDictionary> = {
  [Locale.EN]: EN_COMPARISON_CONTENT,
  [Locale.AR]: AR_COMPARISON_CONTENT,
  [Locale.FR]: FR_COMPARISON_CONTENT,
  [Locale.IT]: IT_COMPARISON_CONTENT,
  [Locale.DE]: DE_COMPARISON_CONTENT,
  [Locale.ES]: ES_COMPARISON_CONTENT,
  [Locale.RU]: RU_COMPARISON_CONTENT,
  [Locale.PT]: PT_COMPARISON_CONTENT,
  [Locale.HI]: HI_COMPARISON_CONTENT,
  [Locale.JA]: JA_COMPARISON_CONTENT,
  [Locale.TH]: TH_COMPARISON_CONTENT,
  [Locale.FA]: FA_COMPARISON_CONTENT,
  [Locale.ZH]: ZH_COMPARISON_CONTENT,
};
