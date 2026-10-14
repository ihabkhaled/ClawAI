/**
 * Where a plugin consent request stands, as plugin-service reports it
 * (`POST /internal/plugins/consent-requests/:id/wait`). The same strings it sends.
 */
export enum PluginConsentState {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  EXPIRED = 'EXPIRED',
  CONSUMED = 'CONSUMED',
}
