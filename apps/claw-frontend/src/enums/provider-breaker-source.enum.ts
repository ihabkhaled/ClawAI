/**
 * Where the skipped-provider list came from. MEMORY: Redis was unavailable and
 * the answering chat-service replica reported only its own copy.
 */
export enum ProviderBreakerSource {
  REDIS = 'REDIS',
  MEMORY = 'MEMORY',
}
