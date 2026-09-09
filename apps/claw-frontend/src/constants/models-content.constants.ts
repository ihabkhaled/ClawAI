import { AR_MODELS_CONTENT } from '@/constants/models-content/ar.constants';
import { DE_MODELS_CONTENT } from '@/constants/models-content/de.constants';
import { EN_MODELS_CONTENT } from '@/constants/models-content/en.constants';
import { ES_MODELS_CONTENT } from '@/constants/models-content/es.constants';
import { FA_MODELS_CONTENT } from '@/constants/models-content/fa.constants';
import { FR_MODELS_CONTENT } from '@/constants/models-content/fr.constants';
import { HI_MODELS_CONTENT } from '@/constants/models-content/hi.constants';
import { IT_MODELS_CONTENT } from '@/constants/models-content/it.constants';
import { JA_MODELS_CONTENT } from '@/constants/models-content/ja.constants';
import { PT_MODELS_CONTENT } from '@/constants/models-content/pt.constants';
import { RU_MODELS_CONTENT } from '@/constants/models-content/ru.constants';
import { TH_MODELS_CONTENT } from '@/constants/models-content/th.constants';
import { ZH_MODELS_CONTENT } from '@/constants/models-content/zh.constants';
import { Locale } from '@/enums/locale.enum';
import type { ModelsContentByLocale } from '@/types/models.types';

/**
 * The `/models` cluster's copy, one dictionary per locale. See
 * `learn-content.constants.ts` for why body copy lives here rather than in the
 * global i18n dictionary.
 */
export const MODELS_CONTENT_BY_LOCALE: ModelsContentByLocale = {
  [Locale.EN]: EN_MODELS_CONTENT,
  [Locale.AR]: AR_MODELS_CONTENT,
  [Locale.DE]: DE_MODELS_CONTENT,
  [Locale.ES]: ES_MODELS_CONTENT,
  [Locale.FA]: FA_MODELS_CONTENT,
  [Locale.FR]: FR_MODELS_CONTENT,
  [Locale.HI]: HI_MODELS_CONTENT,
  [Locale.IT]: IT_MODELS_CONTENT,
  [Locale.JA]: JA_MODELS_CONTENT,
  [Locale.PT]: PT_MODELS_CONTENT,
  [Locale.RU]: RU_MODELS_CONTENT,
  [Locale.TH]: TH_MODELS_CONTENT,
  [Locale.ZH]: ZH_MODELS_CONTENT,
};
