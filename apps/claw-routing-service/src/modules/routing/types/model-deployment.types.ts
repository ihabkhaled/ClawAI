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
