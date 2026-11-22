import { Locale } from '@/enums/locale.enum';
import type { LiveIntelligenceMarketingDictionary } from '@/types/live-intelligence-marketing-content.types';

import { AR_LIVE_INTELLIGENCE_MARKETING_CONTENT } from './live-intelligence-marketing-content/ar.constants';
import { DE_LIVE_INTELLIGENCE_MARKETING_CONTENT } from './live-intelligence-marketing-content/de.constants';
import { EN_LIVE_INTELLIGENCE_MARKETING_CONTENT } from './live-intelligence-marketing-content/en.constants';
import { ES_LIVE_INTELLIGENCE_MARKETING_CONTENT } from './live-intelligence-marketing-content/es.constants';
import { FA_LIVE_INTELLIGENCE_MARKETING_CONTENT } from './live-intelligence-marketing-content/fa.constants';
import { FR_LIVE_INTELLIGENCE_MARKETING_CONTENT } from './live-intelligence-marketing-content/fr.constants';
import { HI_LIVE_INTELLIGENCE_MARKETING_CONTENT } from './live-intelligence-marketing-content/hi.constants';
import { IT_LIVE_INTELLIGENCE_MARKETING_CONTENT } from './live-intelligence-marketing-content/it.constants';
import { JA_LIVE_INTELLIGENCE_MARKETING_CONTENT } from './live-intelligence-marketing-content/ja.constants';
import { PT_LIVE_INTELLIGENCE_MARKETING_CONTENT } from './live-intelligence-marketing-content/pt.constants';
import { RU_LIVE_INTELLIGENCE_MARKETING_CONTENT } from './live-intelligence-marketing-content/ru.constants';
import { TH_LIVE_INTELLIGENCE_MARKETING_CONTENT } from './live-intelligence-marketing-content/th.constants';
import { ZH_LIVE_INTELLIGENCE_MARKETING_CONTENT } from './live-intelligence-marketing-content/zh.constants';

/** Live Intelligence page copy, translated per locale. */
export const LIVE_INTELLIGENCE_MARKETING_CONTENT_BY_LOCALE: Record<
  Locale,
  LiveIntelligenceMarketingDictionary
> = {
  [Locale.EN]: EN_LIVE_INTELLIGENCE_MARKETING_CONTENT,
  [Locale.AR]: AR_LIVE_INTELLIGENCE_MARKETING_CONTENT,
  [Locale.FR]: FR_LIVE_INTELLIGENCE_MARKETING_CONTENT,
  [Locale.IT]: IT_LIVE_INTELLIGENCE_MARKETING_CONTENT,
  [Locale.DE]: DE_LIVE_INTELLIGENCE_MARKETING_CONTENT,
  [Locale.ES]: ES_LIVE_INTELLIGENCE_MARKETING_CONTENT,
  [Locale.RU]: RU_LIVE_INTELLIGENCE_MARKETING_CONTENT,
  [Locale.PT]: PT_LIVE_INTELLIGENCE_MARKETING_CONTENT,
  [Locale.HI]: HI_LIVE_INTELLIGENCE_MARKETING_CONTENT,
  [Locale.JA]: JA_LIVE_INTELLIGENCE_MARKETING_CONTENT,
  [Locale.TH]: TH_LIVE_INTELLIGENCE_MARKETING_CONTENT,
  [Locale.FA]: FA_LIVE_INTELLIGENCE_MARKETING_CONTENT,
  [Locale.ZH]: ZH_LIVE_INTELLIGENCE_MARKETING_CONTENT,
};
