import type { PluginConsentState } from '../enums/plugin-consent-state.enum';
import type { PluginConsentWaitRequest } from '../types/plugin-consent.types';

/**
 * What the plugin tool loop needs to park a turn on the answer to the consent card. An abstract
 * class so it is also the Nest injection token; tests hand the loop a fake.
 *
 *   POST /api/v1/internal/plugins/consent-requests/:id/wait  { userId, waitMs }
 *     -> { id, status, choice, expiresAt, ... }
 *
 * The wait is bounded on both sides: plugin-service answers PENDING after `waitMs`, and the loop
 * stops asking at the request's own deadline.
 */
export abstract class PluginConsentPort {
  /** Throws when plugin-service cannot answer; the loop then denies the call safely. */
  abstract wait(request: PluginConsentWaitRequest): Promise<PluginConsentState>;
}
