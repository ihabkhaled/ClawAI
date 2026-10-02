import { SetMetadata } from '@nestjs/common';

export const ALLOW_SERVICE_TOKEN_KEY = 'allowServiceToken';

/**
 * Lets the global `AuthGuard` accept the inter-service token
 * (`Authorization: Service <INTER_SERVICE_AUTH_TOKEN>`) on this route IN
 * ADDITION to a user JWT. Without it a service token is refused (401), so a
 * leaked token cannot reach routes that were never meant for services.
 */
export const AllowServiceToken = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(ALLOW_SERVICE_TOKEN_KEY, true);
