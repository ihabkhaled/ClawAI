/**
 * Where a model-capability claim came from.
 *
 * The ordering is deliberate and load-bearing: a later source outranks an
 * earlier one, because it is backed by more direct observation. The registry
 * only ever upgrades a record — a curated list must never overwrite a probe
 * result that actually exercised the model.
 *
 * PROVIDER_ADVERTISED — the provider (or a curated family list standing in for
 *   a provider that exposes no capability field) says so. Cheap and immediate,
 *   but it is a claim, not a demonstration.
 * SERVER_PROBED — the serving stack was queried for this exact model/digest
 *   (e.g. Ollama `/api/show`). Proves what the server believes it loaded.
 * BEHAVIOR_PROBED — the model was actually asked to do the thing and did it.
 *   The only source that can justify `PROVEN`.
 * ADMIN_OVERRIDE — a human asserted it. Outranks everything so an operator can
 *   unblock a model the probes get wrong, and is recorded as such rather than
 *   being laundered into looking like evidence.
 */
export enum CapabilityEvidenceSource {
  PROVIDER_ADVERTISED = 'PROVIDER_ADVERTISED',
  SERVER_PROBED = 'SERVER_PROBED',
  BEHAVIOR_PROBED = 'BEHAVIOR_PROBED',
  ADMIN_OVERRIDE = 'ADMIN_OVERRIDE',
}
