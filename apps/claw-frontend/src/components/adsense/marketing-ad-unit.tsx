'use client';

import { AdUnit } from '@/components/adsense/ad-unit';
import { MARKETING_AD_RESERVED_HEIGHT } from '@/constants/shared-chat-ads.constants';
import { useTranslation } from '@/lib/i18n';
import type { MarketingAdUnitProps } from '@/types/adsense.types';

export function MarketingAdUnit({
  slot,
  pathname,
  serverEligibility,
  className,
}: MarketingAdUnitProps): React.ReactElement | null {
  const { t } = useTranslation();

  return (
    <AdUnit
      slot={slot}
      reservedHeight={MARKETING_AD_RESERVED_HEIGHT}
      pathname={pathname}
      serverEligibility={serverEligibility}
      label={t('chatShare.public.advertisement')}
      className={className}
    />
  );
}
