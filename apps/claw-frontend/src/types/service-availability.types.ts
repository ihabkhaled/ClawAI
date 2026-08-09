import type { AggregatedHealth } from './health.types';

export type UseServiceAvailabilityReturn = {
  health: AggregatedHealth | undefined;
  isLoading: boolean;
};
