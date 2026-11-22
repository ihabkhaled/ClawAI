import { LIVE_INTELLIGENCE_MARKETING_CONTENT_BY_LOCALE } from '@/constants/live-intelligence-marketing-content.constants';
import type { Locale } from '@/enums/locale.enum';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import type { LiveIntelligenceMarketingDictionary } from '@/types/live-intelligence-marketing-content.types';

/** The Live Intelligence page copy for one locale, falling back to English for a bad runtime string. */
export function getLiveIntelligenceMarketingContent(
  locale: Locale,
): LiveIntelligenceMarketingDictionary {
  return (
    LIVE_INTELLIGENCE_MARKETING_CONTENT_BY_LOCALE[locale] ??
    LIVE_INTELLIGENCE_MARKETING_CONTENT_BY_LOCALE[DEFAULT_LOCALE]
  );
}
