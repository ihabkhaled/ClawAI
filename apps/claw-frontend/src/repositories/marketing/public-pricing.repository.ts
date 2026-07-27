import type { PublicPlan } from '@/types/public-pricing.types';

export const publicPricingRepository = {
  async list(signal?: AbortSignal): Promise<PublicPlan[]> {
    const response = await fetch('/api/pricing', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    });
    if (!response.ok) {
      throw new Error('Pricing catalog request failed');
    }
    return (await response.json()) as PublicPlan[];
  },
};
