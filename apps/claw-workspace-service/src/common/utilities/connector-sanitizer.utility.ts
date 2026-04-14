import { type PaginatedWorkspaceConnectors, type WorkspaceConnectorWithStats  } from '../../modules/workspace/types/workspace.types';

export function sanitizeConnector(
  connector: WorkspaceConnectorWithStats,
): WorkspaceConnectorWithStats {
  const { encryptedTokens: _stripped, ...safe } = connector;
  return safe as WorkspaceConnectorWithStats;
}

export function sanitizeConnectors(
  paginated: PaginatedWorkspaceConnectors,
): PaginatedWorkspaceConnectors {
  return { ...paginated, data: paginated.data.map(sanitizeConnector) };
}
