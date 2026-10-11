import { Locale } from '@/enums/locale.enum';
import type { MarketingScenesLocaleContent } from '@/types/marketing-scenes.types';

import { AR_MARKETING_SCENES_CONTENT } from './marketing-scenes-content/ar.constants';
import { DE_MARKETING_SCENES_CONTENT } from './marketing-scenes-content/de.constants';
import { EN_MARKETING_SCENES_CONTENT } from './marketing-scenes-content/en.constants';
import { ES_MARKETING_SCENES_CONTENT } from './marketing-scenes-content/es.constants';
import { FA_MARKETING_SCENES_CONTENT } from './marketing-scenes-content/fa.constants';
import { FR_MARKETING_SCENES_CONTENT } from './marketing-scenes-content/fr.constants';
import { HI_MARKETING_SCENES_CONTENT } from './marketing-scenes-content/hi.constants';
import { IT_MARKETING_SCENES_CONTENT } from './marketing-scenes-content/it.constants';
import { JA_MARKETING_SCENES_CONTENT } from './marketing-scenes-content/ja.constants';
import { PT_MARKETING_SCENES_CONTENT } from './marketing-scenes-content/pt.constants';
import { RU_MARKETING_SCENES_CONTENT } from './marketing-scenes-content/ru.constants';
import { TH_MARKETING_SCENES_CONTENT } from './marketing-scenes-content/th.constants';
import { ZH_MARKETING_SCENES_CONTENT } from './marketing-scenes-content/zh.constants';

/**
 * Alt text, captions and the gallery heading for every marketing screenshot, in all 13 locales.
 * A `Record<Locale, ...>` so a missing locale is a compile error; each scene is a
 * `Record<MarketingSceneId, ...>` so a missing scene is one too.
 */
export const MARKETING_SCENES_CONTENT_BY_LOCALE: Record<Locale, MarketingScenesLocaleContent> = {
  [Locale.EN]: EN_MARKETING_SCENES_CONTENT,
  [Locale.AR]: AR_MARKETING_SCENES_CONTENT,
  [Locale.FR]: FR_MARKETING_SCENES_CONTENT,
  [Locale.IT]: IT_MARKETING_SCENES_CONTENT,
  [Locale.DE]: DE_MARKETING_SCENES_CONTENT,
  [Locale.ES]: ES_MARKETING_SCENES_CONTENT,
  [Locale.RU]: RU_MARKETING_SCENES_CONTENT,
  [Locale.PT]: PT_MARKETING_SCENES_CONTENT,
  [Locale.HI]: HI_MARKETING_SCENES_CONTENT,
  [Locale.JA]: JA_MARKETING_SCENES_CONTENT,
  [Locale.TH]: TH_MARKETING_SCENES_CONTENT,
  [Locale.FA]: FA_MARKETING_SCENES_CONTENT,
  [Locale.ZH]: ZH_MARKETING_SCENES_CONTENT,
};
