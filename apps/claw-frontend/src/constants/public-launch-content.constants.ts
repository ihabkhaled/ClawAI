import { Locale } from '@/enums/locale.enum';
import type {
  PublicLaunchLabels,
  PublicLaunchPageDictionary,
} from '@/types/public-launch-content.types';

import {
  EN_PUBLIC_LAUNCH_LABELS,
  EN_PUBLIC_LAUNCH_PAGES,
} from './public-launch-content/en.constants';

export const PUBLIC_LAUNCH_CONTENT_BY_LOCALE: Record<Locale, PublicLaunchPageDictionary> = {
  [Locale.EN]: EN_PUBLIC_LAUNCH_PAGES,
  [Locale.AR]: EN_PUBLIC_LAUNCH_PAGES,
  [Locale.FR]: EN_PUBLIC_LAUNCH_PAGES,
  [Locale.IT]: EN_PUBLIC_LAUNCH_PAGES,
  [Locale.DE]: EN_PUBLIC_LAUNCH_PAGES,
  [Locale.ES]: EN_PUBLIC_LAUNCH_PAGES,
  [Locale.RU]: EN_PUBLIC_LAUNCH_PAGES,
  [Locale.PT]: EN_PUBLIC_LAUNCH_PAGES,
  [Locale.HI]: EN_PUBLIC_LAUNCH_PAGES,
  [Locale.JA]: EN_PUBLIC_LAUNCH_PAGES,
  [Locale.TH]: EN_PUBLIC_LAUNCH_PAGES,
  [Locale.FA]: EN_PUBLIC_LAUNCH_PAGES,
  [Locale.ZH]: EN_PUBLIC_LAUNCH_PAGES,
};

export const PUBLIC_LAUNCH_LABELS_BY_LOCALE: Record<Locale, PublicLaunchLabels> = {
  [Locale.EN]: EN_PUBLIC_LAUNCH_LABELS,
  [Locale.AR]: EN_PUBLIC_LAUNCH_LABELS,
  [Locale.FR]: EN_PUBLIC_LAUNCH_LABELS,
  [Locale.IT]: EN_PUBLIC_LAUNCH_LABELS,
  [Locale.DE]: EN_PUBLIC_LAUNCH_LABELS,
  [Locale.ES]: EN_PUBLIC_LAUNCH_LABELS,
  [Locale.RU]: EN_PUBLIC_LAUNCH_LABELS,
  [Locale.PT]: EN_PUBLIC_LAUNCH_LABELS,
  [Locale.HI]: EN_PUBLIC_LAUNCH_LABELS,
  [Locale.JA]: EN_PUBLIC_LAUNCH_LABELS,
  [Locale.TH]: EN_PUBLIC_LAUNCH_LABELS,
  [Locale.FA]: EN_PUBLIC_LAUNCH_LABELS,
  [Locale.ZH]: EN_PUBLIC_LAUNCH_LABELS,
};
