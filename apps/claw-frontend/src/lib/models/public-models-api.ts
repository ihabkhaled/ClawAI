import type { PublicModelCatalog } from '@/types/public-models.types';

const MODELS_FETCH_TIMEOUT_MS = 5_000;
const PUBLIC_MODEL_CATALOG_PATH = '/api/v1/internal/connectors/public-catalog';

export function getConnectorServiceOrigin(): string | null {
  const raw = process.env['CONNECTOR_SERVICE_URL'];
  if (raw === undefined || raw.trim() === '') {
    return null;
  }
  return raw.trim().replace(/\/$/u, '');
}

/**
 * The live model catalog, fetched server-side with the inter-service token.
 *
 * Mirrors `fetchPublicPricingCatalog` on purpose — same shape, same timeout,
 * same null-on-failure contract — because the two are the same kind of thing:
 * a marketing page reading a fact that only a backend knows. Keeping them
 * parallel means a reader who has understood one has understood both.
 *
 * **Server-only.** The token must never reach a browser, so this is called from
 * server components and the `/api/models` route handler, never from a hook.
 *
 * Returns `null` rather than throwing on any failure, and the caller decides
 * what to say. It deliberately does NOT fall back to a hardcoded list: that is
 * exactly what the deleted `public-pricing-fallback.constants.ts` did for
 * prices, and a stale model list published confidently is the same failure in a
 * different currency.
 */
export async function fetchPublicModelCatalog(): Promise<PublicModelCatalog | null> {
  const origin = getConnectorServiceOrigin();
  const serviceToken = process.env['INTER_SERVICE_AUTH_TOKEN'];
  if (origin === null || serviceToken === undefined || serviceToken.trim() === '') {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODELS_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${origin}${PUBLIC_MODEL_CATALOG_PATH}`, {
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
    return (await response.json()) as PublicModelCatalog;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
