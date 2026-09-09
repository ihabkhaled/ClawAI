import { AR_COMPARE_MODELS_CONTENT } from '@/constants/compare-models-content/ar.constants';
import { DE_COMPARE_MODELS_CONTENT } from '@/constants/compare-models-content/de.constants';
import { EN_COMPARE_MODELS_CONTENT } from '@/constants/compare-models-content/en.constants';
import { ES_COMPARE_MODELS_CONTENT } from '@/constants/compare-models-content/es.constants';
import { FA_COMPARE_MODELS_CONTENT } from '@/constants/compare-models-content/fa.constants';
import { FR_COMPARE_MODELS_CONTENT } from '@/constants/compare-models-content/fr.constants';
import { HI_COMPARE_MODELS_CONTENT } from '@/constants/compare-models-content/hi.constants';
import { IT_COMPARE_MODELS_CONTENT } from '@/constants/compare-models-content/it.constants';
import { JA_COMPARE_MODELS_CONTENT } from '@/constants/compare-models-content/ja.constants';
import { PT_COMPARE_MODELS_CONTENT } from '@/constants/compare-models-content/pt.constants';
import { RU_COMPARE_MODELS_CONTENT } from '@/constants/compare-models-content/ru.constants';
import { TH_COMPARE_MODELS_CONTENT } from '@/constants/compare-models-content/th.constants';
import { ZH_COMPARE_MODELS_CONTENT } from '@/constants/compare-models-content/zh.constants';
import { Locale } from '@/enums/locale.enum';
import type { CompareModelsContentByLocale } from '@/types/compare-models.types';

/**
 * The `/compare/models` cluster's copy, one dictionary per locale. See
 * `model-fit-content.constants.ts` for why body copy lives here rather than
 * in the global i18n dictionary.
 */
export const COMPARE_MODELS_CONTENT_BY_LOCALE: CompareModelsContentByLocale = {
  [Locale.EN]: EN_COMPARE_MODELS_CONTENT,
  [Locale.AR]: AR_COMPARE_MODELS_CONTENT,
  [Locale.DE]: DE_COMPARE_MODELS_CONTENT,
  [Locale.ES]: ES_COMPARE_MODELS_CONTENT,
  [Locale.FA]: FA_COMPARE_MODELS_CONTENT,
  [Locale.FR]: FR_COMPARE_MODELS_CONTENT,
  [Locale.HI]: HI_COMPARE_MODELS_CONTENT,
  [Locale.IT]: IT_COMPARE_MODELS_CONTENT,
  [Locale.JA]: JA_COMPARE_MODELS_CONTENT,
  [Locale.PT]: PT_COMPARE_MODELS_CONTENT,
  [Locale.RU]: RU_COMPARE_MODELS_CONTENT,
  [Locale.TH]: TH_COMPARE_MODELS_CONTENT,
  [Locale.ZH]: ZH_COMPARE_MODELS_CONTENT,
};
