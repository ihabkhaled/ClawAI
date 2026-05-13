import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { ModelsSnapshotManager } from '../managers/models-snapshot.manager';
import { ConnectorsService } from '../services/connectors.service';
import {
  type ConnectorConfigResult,
  type ConnectorModelsSnapshotResult,
} from '../types/connectors.types';

@Controller('internal/connectors')
export class ConnectorsInternalController {
  constructor(
    private readonly connectorsService: ConnectorsService,
    private readonly modelsSnapshotManager: ModelsSnapshotManager,
  ) {}

  @Public()
  @Get('config')
  async getConfig(@Query('provider') provider: string): Promise<ConnectorConfigResult> {
    return this.connectorsService.getConnectorConfig(provider);
  }

  @Public()
  @Get('models-snapshot')
  async getModelsSnapshot(): Promise<ConnectorModelsSnapshotResult> {
    return this.modelsSnapshotManager.build();
  }
}
