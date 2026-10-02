// Connector-service `ModelLifecycle` (prisma), what the PROVIDER says about a
// synced model. Not the public catalogue's lowercase ModelLifecycle.
export enum ConnectorModelLifecycle {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  SUNSET = 'SUNSET',
  REMOVED = 'REMOVED',
}
