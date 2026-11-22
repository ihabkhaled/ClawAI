import { PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE } from '@/constants/public-commerce-policy-content.constants';
import { Locale } from '@/enums/locale.enum';
import type {
  PublicLaunchCorePageDictionary,
  PublicLaunchLabels,
  PublicLaunchLocalizedLabels,
  PublicLaunchPageDictionary,
} from '@/types/public-launch-content.types';

import {
  AR_PUBLIC_LAUNCH_LABELS,
  AR_PUBLIC_LAUNCH_PAGES,
} from './public-launch-content/ar.constants';
import {
  DE_PUBLIC_LAUNCH_LABELS,
  DE_PUBLIC_LAUNCH_PAGES,
} from './public-launch-content/de.constants';
import {
  EN_PUBLIC_LAUNCH_LABELS,
  EN_PUBLIC_LAUNCH_PAGES,
} from './public-launch-content/en.constants';
import {
  ES_PUBLIC_LAUNCH_LABELS,
  ES_PUBLIC_LAUNCH_PAGES,
} from './public-launch-content/es.constants';
import {
  FA_PUBLIC_LAUNCH_LABELS,
  FA_PUBLIC_LAUNCH_PAGES,
} from './public-launch-content/fa.constants';
import {
  FR_PUBLIC_LAUNCH_LABELS,
  FR_PUBLIC_LAUNCH_PAGES,
} from './public-launch-content/fr.constants';
import {
  HI_PUBLIC_LAUNCH_LABELS,
  HI_PUBLIC_LAUNCH_PAGES,
} from './public-launch-content/hi.constants';
import {
  IT_PUBLIC_LAUNCH_LABELS,
  IT_PUBLIC_LAUNCH_PAGES,
} from './public-launch-content/it.constants';
import {
  JA_PUBLIC_LAUNCH_LABELS,
  JA_PUBLIC_LAUNCH_PAGES,
} from './public-launch-content/ja.constants';
import {
  PT_PUBLIC_LAUNCH_LABELS,
  PT_PUBLIC_LAUNCH_PAGES,
} from './public-launch-content/pt.constants';
import {
  RU_PUBLIC_LAUNCH_LABELS,
  RU_PUBLIC_LAUNCH_PAGES,
} from './public-launch-content/ru.constants';
import {
  TH_PUBLIC_LAUNCH_LABELS,
  TH_PUBLIC_LAUNCH_PAGES,
} from './public-launch-content/th.constants';
import {
  ZH_PUBLIC_LAUNCH_LABELS,
  ZH_PUBLIC_LAUNCH_PAGES,
} from './public-launch-content/zh.constants';

type ExtraLabels = Omit<PublicLaunchLabels, keyof PublicLaunchLocalizedLabels>;

/** Every locale's own launch-page bodies (about, pricing, legal, ...). */
const CORE_PAGES_BY_LOCALE: Record<Locale, PublicLaunchCorePageDictionary> = {
  [Locale.EN]: EN_PUBLIC_LAUNCH_PAGES,
  [Locale.AR]: AR_PUBLIC_LAUNCH_PAGES,
  [Locale.FR]: FR_PUBLIC_LAUNCH_PAGES,
  [Locale.IT]: IT_PUBLIC_LAUNCH_PAGES,
  [Locale.DE]: DE_PUBLIC_LAUNCH_PAGES,
  [Locale.ES]: ES_PUBLIC_LAUNCH_PAGES,
  [Locale.RU]: RU_PUBLIC_LAUNCH_PAGES,
  [Locale.PT]: PT_PUBLIC_LAUNCH_PAGES,
  [Locale.HI]: HI_PUBLIC_LAUNCH_PAGES,
  [Locale.JA]: JA_PUBLIC_LAUNCH_PAGES,
  [Locale.TH]: TH_PUBLIC_LAUNCH_PAGES,
  [Locale.FA]: FA_PUBLIC_LAUNCH_PAGES,
  [Locale.ZH]: ZH_PUBLIC_LAUNCH_PAGES,
};

/** Every locale's labels beyond the page chrome (the chrome ships with the commerce policies). */
const EXTRA_LABELS_BY_LOCALE: Record<Locale, ExtraLabels> = {
  [Locale.EN]: EN_PUBLIC_LAUNCH_LABELS,
  [Locale.AR]: AR_PUBLIC_LAUNCH_LABELS,
  [Locale.FR]: FR_PUBLIC_LAUNCH_LABELS,
  [Locale.IT]: IT_PUBLIC_LAUNCH_LABELS,
  [Locale.DE]: DE_PUBLIC_LAUNCH_LABELS,
  [Locale.ES]: ES_PUBLIC_LAUNCH_LABELS,
  [Locale.RU]: RU_PUBLIC_LAUNCH_LABELS,
  [Locale.PT]: PT_PUBLIC_LAUNCH_LABELS,
  [Locale.HI]: HI_PUBLIC_LAUNCH_LABELS,
  [Locale.JA]: JA_PUBLIC_LAUNCH_LABELS,
  [Locale.TH]: TH_PUBLIC_LAUNCH_LABELS,
  [Locale.FA]: FA_PUBLIC_LAUNCH_LABELS,
  [Locale.ZH]: ZH_PUBLIC_LAUNCH_LABELS,
};

// Every launch page (about, pricing, models, security, legal) ships its own
// translation per locale; the commerce policies (delivery, refund) and the
// page chrome come from the commerce-policy dictionary.
export const PUBLIC_LAUNCH_CONTENT_BY_LOCALE = Object.fromEntries(
  Object.values(Locale).map((locale) => [
    locale,
    {
      ...CORE_PAGES_BY_LOCALE[locale],
      ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[locale].pages,
    },
  ]),
) as Record<Locale, PublicLaunchPageDictionary>;

export const PUBLIC_LAUNCH_LABELS_BY_LOCALE = Object.fromEntries(
  Object.values(Locale).map((locale) => [
    locale,
    {
      ...EXTRA_LABELS_BY_LOCALE[locale],
      ...PUBLIC_COMMERCE_POLICY_CONTENT_BY_LOCALE[locale].labels,
    },
  ]),
) as Record<Locale, PublicLaunchLabels>;
