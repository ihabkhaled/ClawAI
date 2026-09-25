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
import { FEATURES_FLAGSHIP_CONTENT_BY_LOCALE } from '@/constants/features-flagship-content.constants';
import { Locale } from '@/enums/locale.enum';
import type { FeaturesClusterContentByLocale } from '@/types/features-cluster.types';
import { mergeFeaturesClusterDictionary } from '@/utilities/features-cluster-merge.utility';

/**
 * The `/features` cluster's capability-page copy, one dictionary per locale.
 * See `learn-content.constants.ts` for why body copy lives here rather than
 * in the global i18n dictionary. The original six pages and the flagship
 * pages live in separate per-locale modules and are merged here.
 */
export const FEATURES_CLUSTER_CONTENT_BY_LOCALE: FeaturesClusterContentByLocale = {
  [Locale.EN]: mergeFeaturesClusterDictionary(
    EN_FEATURES_CLUSTER_CONTENT,
    FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[Locale.EN],
  ),
  [Locale.AR]: mergeFeaturesClusterDictionary(
    AR_FEATURES_CLUSTER_CONTENT,
    FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[Locale.AR],
  ),
  [Locale.DE]: mergeFeaturesClusterDictionary(
    DE_FEATURES_CLUSTER_CONTENT,
    FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[Locale.DE],
  ),
  [Locale.ES]: mergeFeaturesClusterDictionary(
    ES_FEATURES_CLUSTER_CONTENT,
    FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[Locale.ES],
  ),
  [Locale.FA]: mergeFeaturesClusterDictionary(
    FA_FEATURES_CLUSTER_CONTENT,
    FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[Locale.FA],
  ),
  [Locale.FR]: mergeFeaturesClusterDictionary(
    FR_FEATURES_CLUSTER_CONTENT,
    FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[Locale.FR],
  ),
  [Locale.HI]: mergeFeaturesClusterDictionary(
    HI_FEATURES_CLUSTER_CONTENT,
    FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[Locale.HI],
  ),
  [Locale.IT]: mergeFeaturesClusterDictionary(
    IT_FEATURES_CLUSTER_CONTENT,
    FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[Locale.IT],
  ),
  [Locale.JA]: mergeFeaturesClusterDictionary(
    JA_FEATURES_CLUSTER_CONTENT,
    FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[Locale.JA],
  ),
  [Locale.PT]: mergeFeaturesClusterDictionary(
    PT_FEATURES_CLUSTER_CONTENT,
    FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[Locale.PT],
  ),
  [Locale.RU]: mergeFeaturesClusterDictionary(
    RU_FEATURES_CLUSTER_CONTENT,
    FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[Locale.RU],
  ),
  [Locale.TH]: mergeFeaturesClusterDictionary(
    TH_FEATURES_CLUSTER_CONTENT,
    FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[Locale.TH],
  ),
  [Locale.ZH]: mergeFeaturesClusterDictionary(
    ZH_FEATURES_CLUSTER_CONTENT,
    FEATURES_FLAGSHIP_CONTENT_BY_LOCALE[Locale.ZH],
  ),
};
