/**
 * Where a breaker listing came from. MEMORY means Redis did not answer in
 * time and this replica is running on its own copy — the admin sees that the
 * list may differ between replicas.
 */
export enum ProviderBreakerSource {
  REDIS = 'REDIS',
  MEMORY = 'MEMORY',
}
