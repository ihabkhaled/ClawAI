import { z } from 'zod';

import { WorkspaceConnectorAccessLevel } from '../../../generated/prisma';

// v3 round 6 (2026-05-12) — Prompt 12 polish: HTTP surface for the
// per-connector grant CRUD. Owner-side endpoints only — gated by the
// service layer via ConnectorAccessService.

export const grantConnectorAccessSchema = z.object({
  granteeUserId: z.string().min(1).max(128),
  accessLevel: z.nativeEnum(WorkspaceConnectorAccessLevel),
});

export type GrantConnectorAccessDto = z.infer<typeof grantConnectorAccessSchema>;
