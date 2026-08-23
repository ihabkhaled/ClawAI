/** The distinct broken states the deployment page gives remediation advice for. */
export enum DeploymentTroubleshootingSituation {
  /** The workflow ended without success while the box still reports running. */
  ABANDONED = 'abandoned',
  /** Still reported as running, but silent past the stale window. */
  STALE = 'stale',
  /** The last rollout failed and nothing is running now. */
  FAILED = 'failed',
  /** No usable credentials, so the page can only watch. */
  UNCONFIGURED = 'unconfigured',
}
