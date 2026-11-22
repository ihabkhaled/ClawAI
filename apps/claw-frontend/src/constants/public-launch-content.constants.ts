import { PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE } from '@/constants/public-commerce-policy-content.constants';
import { Locale } from '@/enums/locale.enum';
import type {
  PublicLaunchLabels,
  PublicLaunchPageDictionary,
} from '@/types/public-launch-content.types';

import {
  EN_PUBLIC_LAUNCH_LABELS,
  EN_PUBLIC_LAUNCH_PAGES,
} from './public-launch-content/en.constants';

// The older launch pages (about, pricing, legal) still render the English body
// in every locale — translating legal text is an open owner item. The two
// commerce policies (delivery, refund) and the page chrome are translated.
export const PUBLIC_LAUNCH_CONTENT_BY_LOCALE: Record<Locale, PublicLaunchPageDictionary> = {
  [Locale.EN]: {
    ...EN_PUBLIC_LAUNCH_PAGES,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.EN].pages,
  },
  [Locale.AR]: {
    ...EN_PUBLIC_LAUNCH_PAGES,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.AR].pages,
  },
  [Locale.FR]: {
    ...EN_PUBLIC_LAUNCH_PAGES,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.FR].pages,
  },
  [Locale.IT]: {
    ...EN_PUBLIC_LAUNCH_PAGES,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.IT].pages,
  },
  [Locale.DE]: {
    ...EN_PUBLIC_LAUNCH_PAGES,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.DE].pages,
  },
  [Locale.ES]: {
    ...EN_PUBLIC_LAUNCH_PAGES,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.ES].pages,
  },
  [Locale.RU]: {
    ...EN_PUBLIC_LAUNCH_PAGES,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.RU].pages,
  },
  [Locale.PT]: {
    ...EN_PUBLIC_LAUNCH_PAGES,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.PT].pages,
  },
  [Locale.HI]: {
    ...EN_PUBLIC_LAUNCH_PAGES,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.HI].pages,
  },
  [Locale.JA]: {
    ...EN_PUBLIC_LAUNCH_PAGES,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.JA].pages,
  },
  [Locale.TH]: {
    ...EN_PUBLIC_LAUNCH_PAGES,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.TH].pages,
  },
  [Locale.FA]: {
    ...EN_PUBLIC_LAUNCH_PAGES,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.FA].pages,
  },
  [Locale.ZH]: {
    ...EN_PUBLIC_LAUNCH_PAGES,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.ZH].pages,
  },
};

export const PUBLIC_LAUNCH_LABELS_BY_LOCALE: Record<Locale, PublicLaunchLabels> = {
  [Locale.EN]: {
    ...EN_PUBLIC_LAUNCH_LABELS,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.EN].labels,
  },
  [Locale.AR]: {
    ...EN_PUBLIC_LAUNCH_LABELS,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.AR].labels,
  },
  [Locale.FR]: {
    ...EN_PUBLIC_LAUNCH_LABELS,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.FR].labels,
  },
  [Locale.IT]: {
    ...EN_PUBLIC_LAUNCH_LABELS,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.IT].labels,
  },
  [Locale.DE]: {
    ...EN_PUBLIC_LAUNCH_LABELS,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.DE].labels,
  },
  [Locale.ES]: {
    ...EN_PUBLIC_LAUNCH_LABELS,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.ES].labels,
  },
  [Locale.RU]: {
    ...EN_PUBLIC_LAUNCH_LABELS,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.RU].labels,
  },
  [Locale.PT]: {
    ...EN_PUBLIC_LAUNCH_LABELS,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.PT].labels,
  },
  [Locale.HI]: {
    ...EN_PUBLIC_LAUNCH_LABELS,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.HI].labels,
  },
  [Locale.JA]: {
    ...EN_PUBLIC_LAUNCH_LABELS,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.JA].labels,
  },
  [Locale.TH]: {
    ...EN_PUBLIC_LAUNCH_LABELS,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.TH].labels,
  },
  [Locale.FA]: {
    ...EN_PUBLIC_LAUNCH_LABELS,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.FA].labels,
  },
  [Locale.ZH]: {
    ...EN_PUBLIC_LAUNCH_LABELS,
    ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[Locale.ZH].labels,
  },
};
