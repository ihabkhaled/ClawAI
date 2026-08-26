import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type ValidateExposedModelsDto,
  validateExposedModelsSchema,
} from '../dto/validate-exposed-models.dto';
import { ModelsSnapshotManager } from '../managers/models-snapshot.manager';
import { ConnectorsService } from '../services/connectors.service';
import {
  type ConnectorConfigResult,
  type ConnectorHealthSnapshotResult,
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

  @Public()
  @Get('health-snapshot')
  async getHealthSnapshot(): Promise<ConnectorHealthSnapshotResult> {
    return this.connectorsService.getHealthSnapshot();
  }

  // auth-service calls this before persisting plan model access, so an
  // administrator cannot entitle a plan to a model that was never synced, is
  // not exposed, or is not a chat deployment. Only the acceptable pairs come
  // back; anything absent is rejected by the caller. It does not report WHY a
  // pair failed, so the endpoint cannot be used to probe which models exist
  // but are deliberately hidden.
  @Public()
  @Post('models/validate-exposed')
  async validateExposedModels(
    @Body(new ZodValidationPipe(validateExposedModelsSchema)) dto: ValidateExposedModelsDto,
  ): Promise<{ valid: Array<{ provider: string; model: string }> }> {
    return this.connectorsService.validateExposedModels(dto.pairs);
  }
}
