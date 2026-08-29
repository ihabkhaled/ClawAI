import type { PaygWalletSnapshot } from '@claw/shared-types';

import type { TranslateFunction } from './i18n.types';
import type { EntitlementQuota } from './plan.types';

export type UseDailyTokenIndicatorResult = {
  quota: EntitlementQuota | null;
  /**
   * The pay-as-you-go wallet. Rendered beside the token bar, because a cloud
   * answer spends both and a user refused on credit while their token bar is
   * green has no way to work out what happened.
   */
  wallet: PaygWalletSnapshot | null;
  isLoading: boolean;
  isWalletLoading: boolean;
  t: TranslateFunction;
  locale: string;
};
