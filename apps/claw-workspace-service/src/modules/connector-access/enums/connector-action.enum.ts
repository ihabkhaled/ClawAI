// v3 round 5 — discrete actions a caller might attempt against a
// connector. The access service maps the caller's effective access
// level onto this enum to decide allow/deny.
export enum ConnectorAction {
  VIEW = 'VIEW',
  PROPOSE_AI_ACTION = 'PROPOSE_AI_ACTION',
  EDIT_CONFIG = 'EDIT_CONFIG',
  MANAGE_GRANTS = 'MANAGE_GRANTS',
}
