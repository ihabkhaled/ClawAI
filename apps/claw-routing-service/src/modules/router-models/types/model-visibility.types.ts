/**
 * What routing-service knows about one model, for connector-service's admin
 * "why is this model not in the picker?" diagnostic (2026-11-22). Narrow on
 * purpose: a class band, never a rate (rule 37).
 */
export type ModelVisibilitySnapshot = {
  provider: string;
  modelKey: string;
  /** False when router_model_registry has no row for this provider/model. */
  inRegistry: boolean;
  /** The registry row's lifecycle; null with no row. */
  lifecycle: string | null;
  /** True for router infrastructure no user may pick; null with no row. */
  isRouterOnly: boolean | null;
  /** The cost class the send path resolves; null = unpriced (blocked, never free). */
  costClass: string | null;
};
