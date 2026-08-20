import type { WorkspaceConnectorAccessLevel, WorkspaceProvider } from '../../../generated/prisma';
import type { ConnectorAccessSource } from '../enums/connector-access-source.enum';

export type ConnectorEffectiveAccess = {
  source: ConnectorAccessSource;
  level: WorkspaceConnectorAccessLevel | null;
};

// Phase 12 — one row of "connectors shared with me": the grant plus just
// enough of the connector to show the grantee something useful. Never
// includes encryptedTokens/scopes/etc — the grantee is not the owner.
export type SharedConnectorView = {
  connectorId: string;
  connectorName: string;
  provider: WorkspaceProvider;
  ownerUserId: string;
  accessLevel: WorkspaceConnectorAccessLevel;
  grantedBy: string;
  grantedAt: Date;
};
