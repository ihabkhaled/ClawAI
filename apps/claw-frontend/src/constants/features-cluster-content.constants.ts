import { AR_FEATURES_CLUSTER_CONTENT } from '@/constants/features-cluster-content/ar.constants';
import { DE_FEATURES_CLUSTER_CONTENT } from '@/constants/features-cluster-content/de.constants';
import { EN_FEATURES_CLUSTER_CONTENT } from '@/constants/features-cluster-content/en.constants';
import { ES_FEATURES_CLUSTER_CONTENT } from '@/constants/features-cluster-content/es.constants';
import { FA_FEATURES_CLUSTER_CONTENT } from '@/constants/features-cluster-content/fa.constants';
import { FR_FEATURES_CLUSTER_CONTENT } from '@/constants/features-cluster-content/fr.constants';
import { HI_FEATURES_CLUSTER_CONTENT } from '@/constants/features-cluster-content/hi.constants';
import { IT_FEATURES_CLUSTER_CONTENT } from '@/constants/features-cluster-content/it.constants';
import { JA_FEATURES_CLUSTER_CONTENT } from '@/constants/features-cluster-content/ja.constants';
import { PT_FEATURES_CLUSTER_CONTENT } from '@/constants/features-cluster-content/pt.constants';
import { RU_FEATURES_CLUSTER_CONTENT } from '@/constants/features-cluster-content/ru.constants';
import { TH_FEATURES_CLUSTER_CONTENT } from '@/constants/features-cluster-content/th.constants';
import { ZH_FEATURES_CLUSTER_CONTENT } from '@/constants/features-cluster-content/zh.constants';
import { Locale } from '@/enums/locale.enum';
import type { FeaturesClusterContentByLocale } from '@/types/features-cluster.types';

/**
 * The `/features` cluster's capability-page copy, one dictionary per locale.
 * See `learn-content.constants.ts` for why body copy lives here rather than
 * in the global i18n dictionary.
 */
export const FEATURES_CLUSTER_CONTENT_BY_LOCALE: FeaturesClusterContentByLocale = {
  [Locale.EN]: EN_FEATURES_CLUSTER_CONTENT,
  [Locale.AR]: AR_FEATURES_CLUSTER_CONTENT,
  [Locale.DE]: DE_FEATURES_CLUSTER_CONTENT,
  [Locale.ES]: ES_FEATURES_CLUSTER_CONTENT,
  [Locale.FA]: FA_FEATURES_CLUSTER_CONTENT,
  [Locale.FR]: FR_FEATURES_CLUSTER_CONTENT,
  [Locale.HI]: HI_FEATURES_CLUSTER_CONTENT,
  [Locale.IT]: IT_FEATURES_CLUSTER_CONTENT,
  [Locale.JA]: JA_FEATURES_CLUSTER_CONTENT,
  [Locale.PT]: PT_FEATURES_CLUSTER_CONTENT,
  [Locale.RU]: RU_FEATURES_CLUSTER_CONTENT,
  [Locale.TH]: TH_FEATURES_CLUSTER_CONTENT,
  [Locale.ZH]: ZH_FEATURES_CLUSTER_CONTENT,
};
