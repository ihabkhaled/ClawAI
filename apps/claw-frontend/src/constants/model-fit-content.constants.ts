import { AR_MODEL_FIT_CONTENT } from '@/constants/model-fit-content/ar.constants';
import { DE_MODEL_FIT_CONTENT } from '@/constants/model-fit-content/de.constants';
import { EN_MODEL_FIT_CONTENT } from '@/constants/model-fit-content/en.constants';
import { ES_MODEL_FIT_CONTENT } from '@/constants/model-fit-content/es.constants';
import { FA_MODEL_FIT_CONTENT } from '@/constants/model-fit-content/fa.constants';
import { FR_MODEL_FIT_CONTENT } from '@/constants/model-fit-content/fr.constants';
import { HI_MODEL_FIT_CONTENT } from '@/constants/model-fit-content/hi.constants';
import { IT_MODEL_FIT_CONTENT } from '@/constants/model-fit-content/it.constants';
import { JA_MODEL_FIT_CONTENT } from '@/constants/model-fit-content/ja.constants';
import { PT_MODEL_FIT_CONTENT } from '@/constants/model-fit-content/pt.constants';
import { RU_MODEL_FIT_CONTENT } from '@/constants/model-fit-content/ru.constants';
import { TH_MODEL_FIT_CONTENT } from '@/constants/model-fit-content/th.constants';
import { ZH_MODEL_FIT_CONTENT } from '@/constants/model-fit-content/zh.constants';
import { Locale } from '@/enums/locale.enum';
import type { ModelFitContentByLocale } from '@/types/model-fit.types';

/**
 * The `/model-fit` cluster's copy, one dictionary per locale. See
 * `learn-content.constants.ts` for why body copy lives here rather than in
 * the global i18n dictionary.
 */
export const MODEL_FIT_CONTENT_BY_LOCALE: ModelFitContentByLocale = {
  [Locale.EN]: EN_MODEL_FIT_CONTENT,
  [Locale.AR]: AR_MODEL_FIT_CONTENT,
  [Locale.DE]: DE_MODEL_FIT_CONTENT,
  [Locale.ES]: ES_MODEL_FIT_CONTENT,
  [Locale.FA]: FA_MODEL_FIT_CONTENT,
  [Locale.FR]: FR_MODEL_FIT_CONTENT,
  [Locale.HI]: HI_MODEL_FIT_CONTENT,
  [Locale.IT]: IT_MODEL_FIT_CONTENT,
  [Locale.JA]: JA_MODEL_FIT_CONTENT,
  [Locale.PT]: PT_MODEL_FIT_CONTENT,
  [Locale.RU]: RU_MODEL_FIT_CONTENT,
  [Locale.TH]: TH_MODEL_FIT_CONTENT,
  [Locale.ZH]: ZH_MODEL_FIT_CONTENT,
};
