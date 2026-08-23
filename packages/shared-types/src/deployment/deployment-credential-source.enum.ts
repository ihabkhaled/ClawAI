/** Where the manual-deployment credentials in use actually came from. */
export enum DeploymentCredentialSource {
  /** Configured from the admin deployment page and stored encrypted. */
  DATABASE = 'database',
  /** Falling back to the GITHUB_DEPLOY_* environment variables. */
  ENVIRONMENT = 'environment',
  /** Neither is configured, so manual deployment is unavailable. */
  NONE = 'none',
}
