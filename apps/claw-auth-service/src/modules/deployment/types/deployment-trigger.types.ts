import { type DeploymentCredentialSource } from '@claw/shared-types';

/** Resolved GitHub dispatch credentials — only ever built when the set is whole. */
export type GithubDeployCredentials = {
  token: string;
  repository: string;
  ref: string;
  source: DeploymentCredentialSource;
  tokenLastFour: string;
  updatedAt: string | null;
};

/** One dispatch request handed to the GitHub Actions adapter. */
export type GithubDispatchRequest = {
  ref: string;
  targetSha: string | null;
};
