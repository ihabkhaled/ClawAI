import { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';
import type {
  PublicCommercePolicyLocaleContent,
  PublicCommercePolicySlug,
} from '@/types/public-launch-content.types';

import { AR_PUBLIC_COMMERCE_POLICY_CONTENT } from './public-commerce-policy-content/ar.constants';
import { DE_PUBLIC_COMMERCE_POLICY_CONTENT } from './public-commerce-policy-content/de.constants';
import { EN_PUBLIC_COMMERCE_POLICY_CONTENT } from './public-commerce-policy-content/en.constants';
import { ES_PUBLIC_COMMERCE_POLICY_CONTENT } from './public-commerce-policy-content/es.constants';
import { FA_PUBLIC_COMMERCE_POLICY_CONTENT } from './public-commerce-policy-content/fa.constants';
import { FR_PUBLIC_COMMERCE_POLICY_CONTENT } from './public-commerce-policy-content/fr.constants';
import { HI_PUBLIC_COMMERCE_POLICY_CONTENT } from './public-commerce-policy-content/hi.constants';
import { IT_PUBLIC_COMMERCE_POLICY_CONTENT } from './public-commerce-policy-content/it.constants';
import { JA_PUBLIC_COMMERCE_POLICY_CONTENT } from './public-commerce-policy-content/ja.constants';
import { PT_PUBLIC_COMMERCE_POLICY_CONTENT } from './public-commerce-policy-content/pt.constants';
import { RU_PUBLIC_COMMERCE_POLICY_CONTENT } from './public-commerce-policy-content/ru.constants';
import { TH_PUBLIC_COMMERCE_POLICY_CONTENT } from './public-commerce-policy-content/th.constants';
import { ZH_PUBLIC_COMMERCE_POLICY_CONTENT } from './public-commerce-policy-content/zh.constants';

/**
 * Delivery & shipping and refund & cancellation: the two commerce policies,
 * with real copy in every locale (unlike the older legal pages, whose bodies
 * are still English everywhere). Also carries the translated page chrome every
 * launch page renders, and the SEO copy the content registry resolves through
 * `public-page-seo-registry.constants.ts`.
 */
export const PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE: Readonly<
  Record<Locale, PublicCommercePolicyLocaleContent>
> = {
  [Locale.EN]: EN_PUBLIC_COMMERCE_POLICY_CONTENT,
  [Locale.AR]: AR_PUBLIC_COMMERCE_POLICY_CONTENT,
  [Locale.FR]: FR_PUBLIC_COMMERCE_POLICY_CONTENT,
  [Locale.IT]: IT_PUBLIC_COMMERCE_POLICY_CONTENT,
  [Locale.DE]: DE_PUBLIC_COMMERCE_POLICY_CONTENT,
  [Locale.ES]: ES_PUBLIC_COMMERCE_POLICY_CONTENT,
  [Locale.RU]: RU_PUBLIC_COMMERCE_POLICY_CONTENT,
  [Locale.PT]: PT_PUBLIC_COMMERCE_POLICY_CONTENT,
  [Locale.HI]: HI_PUBLIC_COMMERCE_POLICY_CONTENT,
  [Locale.JA]: JA_PUBLIC_COMMERCE_POLICY_CONTENT,
  [Locale.TH]: TH_PUBLIC_COMMERCE_POLICY_CONTENT,
  [Locale.FA]: FA_PUBLIC_COMMERCE_POLICY_CONTENT,
  [Locale.ZH]: ZH_PUBLIC_COMMERCE_POLICY_CONTENT,
};

export const PUBLIC_COMMERCE_POLICY_SEO_BY_LOCALE: Readonly<
  Record<Locale, Readonly<Record<PublicCommercePolicySlug, PublicPageSeoCopy>>>
> = {
  [Locale.EN]: EN_PUBLIC_COMMERCE_POLICY_CONTENT.seo,
  [Locale.AR]: AR_PUBLIC_COMMERCE_POLICY_CONTENT.seo,
  [Locale.FR]: FR_PUBLIC_COMMERCE_POLICY_CONTENT.seo,
  [Locale.IT]: IT_PUBLIC_COMMERCE_POLICY_CONTENT.seo,
  [Locale.DE]: DE_PUBLIC_COMMERCE_POLICY_CONTENT.seo,
  [Locale.ES]: ES_PUBLIC_COMMERCE_POLICY_CONTENT.seo,
  [Locale.RU]: RU_PUBLIC_COMMERCE_POLICY_CONTENT.seo,
  [Locale.PT]: PT_PUBLIC_COMMERCE_POLICY_CONTENT.seo,
  [Locale.HI]: HI_PUBLIC_COMMERCE_POLICY_CONTENT.seo,
  [Locale.JA]: JA_PUBLIC_COMMERCE_POLICY_CONTENT.seo,
  [Locale.TH]: TH_PUBLIC_COMMERCE_POLICY_CONTENT.seo,
  [Locale.FA]: FA_PUBLIC_COMMERCE_POLICY_CONTENT.seo,
  [Locale.ZH]: ZH_PUBLIC_COMMERCE_POLICY_CONTENT.seo,
};
