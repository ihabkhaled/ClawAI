export enum DeploymentPhase {
  UNKNOWN = 'unknown',
  PREPARING = 'preparing',
  PLANNING = 'planning',
  BUILDING = 'building',
  DEPLOYING = 'deploying',
  RELOADING_NGINX = 'reloading_nginx',
  VERIFYING = 'verifying',
  FINALIZING = 'finalizing',
  COMPLETED = 'completed',
}
