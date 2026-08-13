export const DEPLOYMENT_STATUS_STALE_MS = 30 * 60 * 1000;
export const DEPLOYMENT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
export const DEPLOYMENT_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
export const DEPLOYMENT_SERVICE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const DEPLOYMENT_WORKFLOW_URL_PREFIX = 'https://github.com/';
