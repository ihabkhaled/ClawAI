/**
 * How an operator asked production to be deployed from the admin deployment
 * page. Every mode ends in the same `deploy-production` workflow dispatch — the
 * mode only decides which commit that dispatch targets.
 */
export enum DeploymentTriggerMode {
  /** Deploy the head of the release branch (the same commit auto-deploy would pick). */
  LATEST = 'latest',
  /** Re-run the deployment for the commit that is already live (recovery re-deploy). */
  REDEPLOY = 'redeploy',
  /** Deploy one exact commit an operator typed (recovery, rollback, or pinning). */
  SHA = 'sha',
}
