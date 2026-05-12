import { Module } from '@nestjs/common';

import { WorkspaceConnectorRepository } from '../workspace/repositories/workspace-connector.repository';
import { ConnectorGrantController } from './controllers/connector-grant.controller';
import { ConnectorGrantRepository } from './repositories/connector-grant.repository';
import { ConnectorAccessService } from './services/connector-access.service';

@Module({
  controllers: [ConnectorGrantController],
  providers: [WorkspaceConnectorRepository, ConnectorGrantRepository, ConnectorAccessService],
  exports: [ConnectorAccessService],
})
export class ConnectorAccessModule {}
