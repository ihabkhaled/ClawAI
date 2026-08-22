/** Resolved GitHub dispatch credentials — only ever built when the set is whole. */
export type GithubDeployCredentials = {
  token: string;
  repository: string;
  ref: string;
};

/** One dispatch request handed to the GitHub Actions adapter. */
export type GithubDispatchRequest = {
  ref: string;
  targetSha: string | null;
};
