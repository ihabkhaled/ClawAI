import { AR_FEATURES_FLAGSHIP_CONTENT } from '@/constants/features-flagship-content/ar.constants';
import { DE_FEATURES_FLAGSHIP_CONTENT } from '@/constants/features-flagship-content/de.constants';
import { EN_FEATURES_FLAGSHIP_CONTENT } from '@/constants/features-flagship-content/en.constants';
import { ES_FEATURES_FLAGSHIP_CONTENT } from '@/constants/features-flagship-content/es.constants';
import { FA_FEATURES_FLAGSHIP_CONTENT } from '@/constants/features-flagship-content/fa.constants';
import { FR_FEATURES_FLAGSHIP_CONTENT } from '@/constants/features-flagship-content/fr.constants';
import { HI_FEATURES_FLAGSHIP_CONTENT } from '@/constants/features-flagship-content/hi.constants';
import { IT_FEATURES_FLAGSHIP_CONTENT } from '@/constants/features-flagship-content/it.constants';
import { JA_FEATURES_FLAGSHIP_CONTENT } from '@/constants/features-flagship-content/ja.constants';
import { PT_FEATURES_FLAGSHIP_CONTENT } from '@/constants/features-flagship-content/pt.constants';
import { RU_FEATURES_FLAGSHIP_CONTENT } from '@/constants/features-flagship-content/ru.constants';
import { TH_FEATURES_FLAGSHIP_CONTENT } from '@/constants/features-flagship-content/th.constants';
import { ZH_FEATURES_FLAGSHIP_CONTENT } from '@/constants/features-flagship-content/zh.constants';
import { Locale } from '@/enums/locale.enum';
import type { FeaturesFlagshipDictionary } from '@/types/features-cluster.types';

/**
 * The flagship `/features/<capability>` pages' copy, one module per locale.
 * Merged into `FEATURES_CLUSTER_CONTENT_BY_LOCALE`; nothing else should read
 * this map directly. Server-only content: never import it from a client
 * component (rules/47).
 */
export const FEATURES_FLAGSHIP_CONTENT_BY_LOCALE: Readonly<
  Record<Locale, FeaturesFlagshipDictionary>
> = {
  [Locale.EN]: EN_FEATURES_FLAGSHIP_CONTENT,
  [Locale.AR]: AR_FEATURES_FLAGSHIP_CONTENT,
  [Locale.DE]: DE_FEATURES_FLAGSHIP_CONTENT,
  [Locale.ES]: ES_FEATURES_FLAGSHIP_CONTENT,
  [Locale.FA]: FA_FEATURES_FLAGSHIP_CONTENT,
  [Locale.FR]: FR_FEATURES_FLAGSHIP_CONTENT,
  [Locale.HI]: HI_FEATURES_FLAGSHIP_CONTENT,
  [Locale.IT]: IT_FEATURES_FLAGSHIP_CONTENT,
  [Locale.JA]: JA_FEATURES_FLAGSHIP_CONTENT,
  [Locale.PT]: PT_FEATURES_FLAGSHIP_CONTENT,
  [Locale.RU]: RU_FEATURES_FLAGSHIP_CONTENT,
  [Locale.TH]: TH_FEATURES_FLAGSHIP_CONTENT,
  [Locale.ZH]: ZH_FEATURES_FLAGSHIP_CONTENT,
};
