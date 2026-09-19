/**
 * What an ops token may read. Read-only by construction: there is no write
 * scope, so a leaked token can read logs and nothing else. Health needs no
 * scope: /api/v1/health is already public. A new read surface adds a scope
 * here rather than widening LOGS_READ.
 */
export enum OpsTokenScope {
  LOGS_READ = 'LOGS_READ',
}
