import { Module } from '@nestjs/common';

import { WorkspaceConnectorRepository } from '../workspace/repositories/workspace-connector.repository';
import { ConnectorGrantRepository } from './repositories/connector-grant.repository';
import { ConnectorAccessService } from './services/connector-access.service';

@Module({
  providers: [WorkspaceConnectorRepository, ConnectorGrantRepository, ConnectorAccessService],
  exports: [ConnectorAccessService],
})
export class ConnectorAccessModule {}
