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
    // An older auth service omits these columns. Defaulting isPublic/isActive
    // to true keeps such a catalog renderable rather than filtering every plan
    // away and showing an empty page, which would look like an outage.
    isPublic: plan.isPublic ?? true,
    isActive: plan.isActive ?? true,
    currency: plan.currency ?? null,
    isTrial: plan.isTrial ?? false,
    trialDurationDays: plan.trialDurationDays ?? null,
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
    // Filtered here, at the one boundary the catalog crosses, rather than in
    // each page that renders it. A retired plan still has to be served to
    // payment-service so existing subscribers keep working — it just must not
    // be sold to anyone new, and a page that forgot the filter would quietly
    // offer it.
    return plans
      .filter((plan) => plan.isPublic !== false && plan.isActive !== false)
      .map(normalizePublicPlan);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
