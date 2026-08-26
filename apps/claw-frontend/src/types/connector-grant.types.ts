// v3 round 8 (2026-05-13) — Connector grant frontend types. Mirrors
// the backend Prisma model WorkspaceConnectorGrant exactly (no field
// renames per the FE-mirror-BE rule).

import type { WorkspaceConnectorAccessLevel } from '@/enums/workspace-connector-access-level.enum';

export type WorkspaceConnectorGrant = {
  id: string;
  connectorId: string;
  userId: string;
  grantedBy: string;
  accessLevel: WorkspaceConnectorAccessLevel;
  createdAt: string;
  updatedAt: string;
};

export type GrantConnectorAccessRequest = {
  granteeUserId: string;
  accessLevel: WorkspaceConnectorAccessLevel;
};

// Phase 12 — one row of "connectors shared with me". Mirrors the backend
// SharedConnectorView exactly.
export type SharedConnectorView = {
  connectorId: string;
  connectorName: string;
  provider: string;
  ownerUserId: string;
  accessLevel: WorkspaceConnectorAccessLevel;
  grantedBy: string;
  grantedAt: string;
};
