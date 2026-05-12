import type { WorkspaceConnectorAccessLevel } from '../../../generated/prisma';
import type { ConnectorAccessSource } from '../enums/connector-access-source.enum';

export type ConnectorEffectiveAccess = {
  source: ConnectorAccessSource;
  level: WorkspaceConnectorAccessLevel | null;
};
