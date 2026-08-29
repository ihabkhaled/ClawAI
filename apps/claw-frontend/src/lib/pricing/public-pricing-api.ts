import type { PublicPlan, PublicPlanResponse } from '@/types/public-pricing.types';

const PRICING_FETCH_TIMEOUT_MS = 5_000;
const PUBLIC_PLAN_CATALOG_PATH = '/api/v1/internal/plans/catalog';

/**
 * Fills in the connector-credit RATE when the catalog does not carry one.
 *
 * An auth service that has not shipped `Plan.paygCreditPercentBps` yet simply
 * omits the field. Normalising it to 0 means the pricing card renders "no
 * connector credit" instead of deriving a figure from `undefined`, and the FE
 * never invents a rate it was not given — quoting a credit we do not grant is
 * the one failure mode worth being conservative about.
 */
function normalizePublicPlan(plan: PublicPlanResponse): PublicPlan {
  return {
    ...plan,
    paygCreditPercentBps: plan.paygCreditPercentBps ?? 0,
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
    const plans = (await response.json()) as PublicPlanResponse[];
    return plans.map(normalizePublicPlan);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
