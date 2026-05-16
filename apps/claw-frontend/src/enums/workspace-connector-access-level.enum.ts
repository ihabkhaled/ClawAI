// v3 round 8 — mirrors the backend Prisma enum
// WorkspaceConnectorAccessLevel exactly. Used by the connector grants
// UI to render badges and drive the access-level select.
export enum WorkspaceConnectorAccessLevel {
  READ_ONLY = 'READ_ONLY',
  AI_ACTIONS = 'AI_ACTIONS',
  FULL = 'FULL',
}
