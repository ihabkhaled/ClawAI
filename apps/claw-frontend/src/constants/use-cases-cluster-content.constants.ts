import { AR_USE_CASES_CLUSTER_CONTENT } from '@/constants/use-cases-cluster-content/ar.constants';
import { DE_USE_CASES_CLUSTER_CONTENT } from '@/constants/use-cases-cluster-content/de.constants';
import { EN_USE_CASES_CLUSTER_CONTENT } from '@/constants/use-cases-cluster-content/en.constants';
import { ES_USE_CASES_CLUSTER_CONTENT } from '@/constants/use-cases-cluster-content/es.constants';
import { FA_USE_CASES_CLUSTER_CONTENT } from '@/constants/use-cases-cluster-content/fa.constants';
import { FR_USE_CASES_CLUSTER_CONTENT } from '@/constants/use-cases-cluster-content/fr.constants';
import { HI_USE_CASES_CLUSTER_CONTENT } from '@/constants/use-cases-cluster-content/hi.constants';
import { IT_USE_CASES_CLUSTER_CONTENT } from '@/constants/use-cases-cluster-content/it.constants';
import { JA_USE_CASES_CLUSTER_CONTENT } from '@/constants/use-cases-cluster-content/ja.constants';
import { PT_USE_CASES_CLUSTER_CONTENT } from '@/constants/use-cases-cluster-content/pt.constants';
import { RU_USE_CASES_CLUSTER_CONTENT } from '@/constants/use-cases-cluster-content/ru.constants';
import { TH_USE_CASES_CLUSTER_CONTENT } from '@/constants/use-cases-cluster-content/th.constants';
import { ZH_USE_CASES_CLUSTER_CONTENT } from '@/constants/use-cases-cluster-content/zh.constants';
import { Locale } from '@/enums/locale.enum';
import type { UseCasesClusterContentByLocale } from '@/types/use-cases-cluster.types';

/**
 * The `/use-cases` cluster's task-page copy, one dictionary per locale. See
 * `learn-content.constants.ts` for why body copy lives here rather than in
 * the global i18n dictionary.
 */
export const USE_CASES_CLUSTER_CONTENT_BY_LOCALE: UseCasesClusterContentByLocale = {
  [Locale.EN]: EN_USE_CASES_CLUSTER_CONTENT,
  [Locale.AR]: AR_USE_CASES_CLUSTER_CONTENT,
  [Locale.DE]: DE_USE_CASES_CLUSTER_CONTENT,
  [Locale.ES]: ES_USE_CASES_CLUSTER_CONTENT,
  [Locale.FA]: FA_USE_CASES_CLUSTER_CONTENT,
  [Locale.FR]: FR_USE_CASES_CLUSTER_CONTENT,
  [Locale.HI]: HI_USE_CASES_CLUSTER_CONTENT,
  [Locale.IT]: IT_USE_CASES_CLUSTER_CONTENT,
  [Locale.JA]: JA_USE_CASES_CLUSTER_CONTENT,
  [Locale.PT]: PT_USE_CASES_CLUSTER_CONTENT,
  [Locale.RU]: RU_USE_CASES_CLUSTER_CONTENT,
  [Locale.TH]: TH_USE_CASES_CLUSTER_CONTENT,
  [Locale.ZH]: ZH_USE_CASES_CLUSTER_CONTENT,
};
