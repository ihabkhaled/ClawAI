import { type DeploymentCredentialSource } from './deployment-credential-source.enum';

/**
 * What the deployment page is allowed to know about the installed credentials.
 *
 * The token itself is never part of this shape and no endpoint returns it —
 * `tokenLastFour` exists so an operator can confirm *which* token is installed
 * without the value ever leaving the server.
 */
export type DeploymentCredentialView = {
  source: DeploymentCredentialSource;
  repository: string | null;
  ref: string | null;
  tokenLastFour: string | null;
  /** Null for environment credentials, which have no update history. */
  updatedAt: string | null;
  /** False when the stored repository or ref no longer passes validation. */
  isUsable: boolean;
};

/** Result of clearing the stored credentials. */
export type DeploymentCredentialClearResult = {
  cleared: boolean;
  /** What the service falls back to now that the stored row is gone. */
  source: DeploymentCredentialSource;
};
