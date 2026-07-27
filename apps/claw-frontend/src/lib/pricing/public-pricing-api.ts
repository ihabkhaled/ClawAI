import type { PublicPlan } from '@/types/public-pricing.types';

const PRICING_FETCH_TIMEOUT_MS = 5_000;
const PUBLIC_PLAN_CATALOG_PATH = '/api/v1/internal/plans/catalog';

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
    return (await response.json()) as PublicPlan[];
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
