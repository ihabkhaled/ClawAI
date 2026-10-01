import { PAYG_DEFAULT_PROVIDERS } from '@claw/shared-constants';

/**
 * What a provider's "credit connector" switch starts at when an admin creates
 * a connector. Mirrors connector-service's `paygDefaultForProvider`; only a
 * starting value, the admin's answer is always sent explicitly.
 */
export function defaultCreditConnectorForProvider(provider: string): boolean {
  const normalized = provider.trim().toUpperCase();
  return PAYG_DEFAULT_PROVIDERS.some((known) => known.toUpperCase() === normalized);
}
