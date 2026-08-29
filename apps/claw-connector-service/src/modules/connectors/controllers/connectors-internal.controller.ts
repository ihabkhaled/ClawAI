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
  type ConnectorPaygPolicyResult,
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

  // auth-service calls this before reserving PAYG credit, to learn which
  // providers cost real money. Provider grain with a per-connector admin
  // override rolled up, because `connectors` has no unique constraint on
  // `provider` and a reservation key therefore cannot address one row
  // (ADR-082). `Connector.isPayAsYouGo` is the runtime authority here, NOT
  // `PAYG_DEFAULT_PROVIDERS` — that constant is only the migration's default,
  // and a predicate compiled into six `node_modules` copies would make the
  // admin toggle unenforceable without a six-container rebuild.
  //
  // NO cache-bust event accompanies a toggle, deliberately: the caller caches
  // for PAYG_POLICY_CACHE_TTL_SECONDS (60 s), which already bounds the staleness
  // of an action taken a handful of times a year.
  //
  // @Public() matches every sibling on this controller. It is safe here and
  // would not be on a money-moving route: the response carries no secret, no
  // user, no balance and no amount — only which providers an operator has
  // classified as paid, which the public pricing page states anyway.
  @Public()
  @Get('payg-policy')
  async getPaygPolicy(): Promise<ConnectorPaygPolicyResult> {
    return this.connectorsService.getPaygPolicy();
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
