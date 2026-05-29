import type { TranslateFunction } from './i18n.types';
import type { EntitlementQuota } from './plan.types';

export type UseDailyTokenIndicatorResult = {
  quota: EntitlementQuota | null;
  isLoading: boolean;
  t: TranslateFunction;
};
