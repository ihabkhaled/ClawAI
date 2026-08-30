import { AR_LEARN_CONTENT } from '@/constants/learn-content/ar.constants';
import { DE_LEARN_CONTENT } from '@/constants/learn-content/de.constants';
import { EN_LEARN_CONTENT } from '@/constants/learn-content/en.constants';
import { ES_LEARN_CONTENT } from '@/constants/learn-content/es.constants';
import { FA_LEARN_CONTENT } from '@/constants/learn-content/fa.constants';
import { FR_LEARN_CONTENT } from '@/constants/learn-content/fr.constants';
import { HI_LEARN_CONTENT } from '@/constants/learn-content/hi.constants';
import { IT_LEARN_CONTENT } from '@/constants/learn-content/it.constants';
import { JA_LEARN_CONTENT } from '@/constants/learn-content/ja.constants';
import { PT_LEARN_CONTENT } from '@/constants/learn-content/pt.constants';
import { RU_LEARN_CONTENT } from '@/constants/learn-content/ru.constants';
import { TH_LEARN_CONTENT } from '@/constants/learn-content/th.constants';
import { ZH_LEARN_CONTENT } from '@/constants/learn-content/zh.constants';
import { Locale } from '@/enums/locale.enum';
import type { LearnContentByLocale } from '@/types/learn.types';

/**
 * The `/learn` cluster's copy, one dictionary per locale.
 *
 * Body copy AND SEO copy live here rather than in the global i18n dictionary,
 * for the reason `public-comparison-content/` does the same: this is long-form
 * page content, and putting it in `lib/i18n/locales` would load eighteen
 * explainers into every authenticated screen. The main dictionaries stay for UI
 * chrome; page prose lives with its cluster.
 */
export const LEARN_CONTENT_BY_LOCALE: LearnContentByLocale = {
  [Locale.EN]: EN_LEARN_CONTENT,
  [Locale.AR]: AR_LEARN_CONTENT,
  [Locale.DE]: DE_LEARN_CONTENT,
  [Locale.ES]: ES_LEARN_CONTENT,
  [Locale.FA]: FA_LEARN_CONTENT,
  [Locale.FR]: FR_LEARN_CONTENT,
  [Locale.HI]: HI_LEARN_CONTENT,
  [Locale.IT]: IT_LEARN_CONTENT,
  [Locale.JA]: JA_LEARN_CONTENT,
  [Locale.PT]: PT_LEARN_CONTENT,
  [Locale.RU]: RU_LEARN_CONTENT,
  [Locale.TH]: TH_LEARN_CONTENT,
  [Locale.ZH]: ZH_LEARN_CONTENT,
};
