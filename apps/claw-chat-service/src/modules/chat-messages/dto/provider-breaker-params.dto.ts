import { z } from 'zod';

import { PROVIDER_BREAKER_PROVIDER_PATTERN } from '../constants/provider-breaker.constants';

/**
 * `DELETE /chat-messages/admin/provider-breakers/:provider`. The provider
 * becomes part of a Redis key, so anything outside the provider-enum shape
 * is refused before it gets there.
 */
export const providerBreakerParamsSchema = z
  .object({
    provider: z.string().regex(PROVIDER_BREAKER_PROVIDER_PATTERN),
  })
  .strict();

export type ProviderBreakerParamsDto = z.infer<typeof providerBreakerParamsSchema>;
