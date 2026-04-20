import type { SearchProvider } from '../../../generated/prisma';
import type { SanitizedSearchProvider } from '../types/sanitized-search-provider.types';

export function sanitizeProvider(provider: SearchProvider): SanitizedSearchProvider {
  const { encryptedSecret, secretVersion, ...rest } = provider;
  return {
    ...rest,
    hasSecret: encryptedSecret !== null,
    secretVersion,
  };
}

export function sanitizeProviders(providers: SearchProvider[]): SanitizedSearchProvider[] {
  return providers.map((p) => sanitizeProvider(p));
}
