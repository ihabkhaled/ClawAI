import { AR_LIVE_INTELLIGENCE_MARKETING_SEO } from '@/constants/live-intelligence-marketing-content/ar.constants';
import { DE_LIVE_INTELLIGENCE_MARKETING_SEO } from '@/constants/live-intelligence-marketing-content/de.constants';
import { EN_LIVE_INTELLIGENCE_MARKETING_SEO } from '@/constants/live-intelligence-marketing-content/en.constants';
import { ES_LIVE_INTELLIGENCE_MARKETING_SEO } from '@/constants/live-intelligence-marketing-content/es.constants';
import { FA_LIVE_INTELLIGENCE_MARKETING_SEO } from '@/constants/live-intelligence-marketing-content/fa.constants';
import { FR_LIVE_INTELLIGENCE_MARKETING_SEO } from '@/constants/live-intelligence-marketing-content/fr.constants';
import { HI_LIVE_INTELLIGENCE_MARKETING_SEO } from '@/constants/live-intelligence-marketing-content/hi.constants';
import { IT_LIVE_INTELLIGENCE_MARKETING_SEO } from '@/constants/live-intelligence-marketing-content/it.constants';
import { JA_LIVE_INTELLIGENCE_MARKETING_SEO } from '@/constants/live-intelligence-marketing-content/ja.constants';
import { PT_LIVE_INTELLIGENCE_MARKETING_SEO } from '@/constants/live-intelligence-marketing-content/pt.constants';
import { RU_LIVE_INTELLIGENCE_MARKETING_SEO } from '@/constants/live-intelligence-marketing-content/ru.constants';
import { TH_LIVE_INTELLIGENCE_MARKETING_SEO } from '@/constants/live-intelligence-marketing-content/th.constants';
import { ZH_LIVE_INTELLIGENCE_MARKETING_SEO } from '@/constants/live-intelligence-marketing-content/zh.constants';
import {
  LIVE_INTELLIGENCE_PLATFORMS_SLUG,
  LIVE_INTELLIGENCE_SLUG,
} from '@/constants/live-intelligence-marketing.constants';
import { Locale } from '@/enums/locale.enum';
import type { PublicPageSeoCopy } from '@/types/content-registry.types';
import type { LiveIntelligenceMarketingSeo } from '@/types/live-intelligence-marketing-content.types';

function bySlug(copy: LiveIntelligenceMarketingSeo): Readonly<Record<string, PublicPageSeoCopy>> {
  return {
    [LIVE_INTELLIGENCE_SLUG]: copy.overview,
    [LIVE_INTELLIGENCE_PLATFORMS_SLUG]: copy.platforms,
  };
}

/**
 * SEO copy for the two public Live & Video Intelligence pages, 13 locales, keyed by slug. The
 * text is written beside the page copy in `live-intelligence-marketing-content/<locale>.constants.ts`
 * and imported by name, so the metadata path does not pull the page body with it. Registered in
 * `CLUSTER_SEO_SOURCES`.
 */
export const LIVE_INTELLIGENCE_SEO_BY_LOCALE: Readonly<
  Record<Locale, Readonly<Record<string, PublicPageSeoCopy>>>
> = {
  [Locale.EN]: bySlug(EN_LIVE_INTELLIGENCE_MARKETING_SEO),
  [Locale.AR]: bySlug(AR_LIVE_INTELLIGENCE_MARKETING_SEO),
  [Locale.FR]: bySlug(FR_LIVE_INTELLIGENCE_MARKETING_SEO),
  [Locale.IT]: bySlug(IT_LIVE_INTELLIGENCE_MARKETING_SEO),
  [Locale.DE]: bySlug(DE_LIVE_INTELLIGENCE_MARKETING_SEO),
  [Locale.ES]: bySlug(ES_LIVE_INTELLIGENCE_MARKETING_SEO),
  [Locale.RU]: bySlug(RU_LIVE_INTELLIGENCE_MARKETING_SEO),
  [Locale.PT]: bySlug(PT_LIVE_INTELLIGENCE_MARKETING_SEO),
  [Locale.HI]: bySlug(HI_LIVE_INTELLIGENCE_MARKETING_SEO),
  [Locale.JA]: bySlug(JA_LIVE_INTELLIGENCE_MARKETING_SEO),
  [Locale.TH]: bySlug(TH_LIVE_INTELLIGENCE_MARKETING_SEO),
  [Locale.FA]: bySlug(FA_LIVE_INTELLIGENCE_MARKETING_SEO),
  [Locale.ZH]: bySlug(ZH_LIVE_INTELLIGENCE_MARKETING_SEO),
};
