import { AR_INTEGRATIONS_CONTENT } from '@/constants/integrations-content/ar.constants';
import { DE_INTEGRATIONS_CONTENT } from '@/constants/integrations-content/de.constants';
import { EN_INTEGRATIONS_CONTENT } from '@/constants/integrations-content/en.constants';
import { ES_INTEGRATIONS_CONTENT } from '@/constants/integrations-content/es.constants';
import { FA_INTEGRATIONS_CONTENT } from '@/constants/integrations-content/fa.constants';
import { FR_INTEGRATIONS_CONTENT } from '@/constants/integrations-content/fr.constants';
import { HI_INTEGRATIONS_CONTENT } from '@/constants/integrations-content/hi.constants';
import { IT_INTEGRATIONS_CONTENT } from '@/constants/integrations-content/it.constants';
import { JA_INTEGRATIONS_CONTENT } from '@/constants/integrations-content/ja.constants';
import { PT_INTEGRATIONS_CONTENT } from '@/constants/integrations-content/pt.constants';
import { RU_INTEGRATIONS_CONTENT } from '@/constants/integrations-content/ru.constants';
import { TH_INTEGRATIONS_CONTENT } from '@/constants/integrations-content/th.constants';
import { ZH_INTEGRATIONS_CONTENT } from '@/constants/integrations-content/zh.constants';
import { Locale } from '@/enums/locale.enum';
import type { IntegrationsContentByLocale } from '@/types/integrations.types';

/**
 * The `/integrations` cluster's copy, one dictionary per locale. See
 * `learn-content.constants.ts` for why body copy lives here rather than in the
 * global i18n dictionary.
 */
export const INTEGRATIONS_CONTENT_BY_LOCALE: IntegrationsContentByLocale = {
  [Locale.EN]: EN_INTEGRATIONS_CONTENT,
  [Locale.AR]: AR_INTEGRATIONS_CONTENT,
  [Locale.DE]: DE_INTEGRATIONS_CONTENT,
  [Locale.ES]: ES_INTEGRATIONS_CONTENT,
  [Locale.FA]: FA_INTEGRATIONS_CONTENT,
  [Locale.FR]: FR_INTEGRATIONS_CONTENT,
  [Locale.HI]: HI_INTEGRATIONS_CONTENT,
  [Locale.IT]: IT_INTEGRATIONS_CONTENT,
  [Locale.JA]: JA_INTEGRATIONS_CONTENT,
  [Locale.PT]: PT_INTEGRATIONS_CONTENT,
  [Locale.RU]: RU_INTEGRATIONS_CONTENT,
  [Locale.TH]: TH_INTEGRATIONS_CONTENT,
  [Locale.ZH]: ZH_INTEGRATIONS_CONTENT,
};
