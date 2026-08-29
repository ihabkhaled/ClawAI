import type { PublicPlan } from '@/types/public-pricing.types';

const PRICING_FETCH_TIMEOUT_MS = 5_000;
const PUBLIC_PLAN_CATALOG_PATH = '/api/v1/internal/plans/catalog';

/**
 * Fills in the connector-credit figure when the catalog does not carry one.
 *
 * `monthlyProviderCostCeilingMicroUsd` was a margin control until ADR-078
 * promoted it, so an auth-service that has not shipped the promotion yet simply
 * omits the field. Normalising it to `null` here means the pricing card renders
 * "not included" instead of `undefined`, and the FE never has to guess a number
 * it was not given.
 */
function normalizePublicPlan(plan: PublicPlan): PublicPlan {
  return {
    ...plan,
    monthlyProviderCostCeilingMicroUsd: plan.monthlyProviderCostCeilingMicroUsd ?? null,
  };
}

export function getAuthServiceOrigin(): string | null {
  const raw = process.env['AUTH_SERVICE_URL'];
  if (raw === undefined || raw.trim() === '') {
    return null;
  }
  return raw.trim().replace(/\/$/u, '');
}

export async function fetchPublicPricingCatalog(): Promise<PublicPlan[] | null> {
  const origin = getAuthServiceOrigin();
  const serviceToken = process.env['INTER_SERVICE_AUTH_TOKEN'];
  if (origin === null || serviceToken === undefined || serviceToken.trim() === '') {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PRICING_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${origin}${PUBLIC_PLAN_CATALOG_PATH}`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        Authorization: `Service ${serviceToken}`,
      },
    });
    if (!response.ok) {
      return null;
    }
    const plans = (await response.json()) as PublicPlan[];
    return plans.map(normalizePublicPlan);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
