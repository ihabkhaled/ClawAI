import type { RouterProvider } from '../../../generated/prisma';

/**
 * A deployment allowed onto the cloud router's candidate set: privacy class
 * and activation state already verified, before ranking. `provider` and
 * `providerModelId` are carried alongside the id so a winning decision can be
 * mapped straight back to an executable provider/model pair without a second
 * database round trip.
 */
export interface EligibleDeploymentRecord {
  id: string;
  provider: RouterProvider;
  providerModelId: string;
}

/**
 * One row of the chain-entry model picker.
 *
 * `isValidated` is surfaced rather than filtered on: a model awaiting its first
 * validation is still a legitimate thing to configure, and hiding it would make
 * most of the catalog unpickable.
 */
export interface SelectableDeploymentRecord {
  id: string;
  provider: string;
  providerModelId: string;
  isValidated: boolean;
}

/** A candidate before filtering, with the state ranking reads. */
export interface RoutableDeploymentRecord extends EligibleDeploymentRecord {
  activationState: string;
}

/** What the AUTO router may pick from for one request. */
export interface CloudRouterCandidateFilter {
  /** Normalised `PROVIDER/model` keys an admin exposed; null = snapshot unavailable. */
  exposed: ReadonlySet<string> | null;
  /** Plan restriction; null = unrestricted (ALLOW_ALL or admin). */
  allowed: ReadonlySet<string> | null;
  connectorHealth: Readonly<Record<string, boolean>>;
  max: number;
}

/** One model row from connector-service's snapshot, the fields routing reads. */
export interface ExposedModelSnapshotEntry {
  provider: string;
  modelKey: string;
  exposure?: string;
  kind?: string;
}

export interface CachedExposedModels {
  keys: ReadonlySet<string>;
  expiresAt: number;
}
