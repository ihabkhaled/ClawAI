// v3 round 5 — where a caller's effective access on a connector
// came from: they own the connector (OWNER), they have an explicit
// grant row (GRANT), or they have no access (NONE).
export enum ConnectorAccessSource {
  OWNER = 'OWNER',
  GRANT = 'GRANT',
  NONE = 'NONE',
}
