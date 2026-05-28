export enum UserRole {
  ADMIN = 'ADMIN',
  // Default role for self-registered SaaS users (Auth/RBAC/Plans flagship).
  USER = 'USER',
  // Legacy roles — retained for backward compatibility with pre-flagship
  // data. The role→permission resolver treats anything other than ADMIN as
  // USER-tier; a migration backfills existing OPERATOR/VIEWER rows to USER.
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}
