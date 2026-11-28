import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { RouterModelsService } from '../services/router-models.service';
import { type ModelSizeCatalog } from '../types/model-size.types';

/**
 * Context window and parameter count of every model, for the model pickers
 * (ADR-234). The chat picker's own list comes from connector-service and carries
 * the context window but no parameter count, so the frontend joins this list on
 * (provider, modelKey).
 *
 * Same permission as the picker list it decorates (`MODEL_USE_ALLOWED`), not an
 * admin one: every user who can pick a model may see how big it is. The payload
 * is size only, never a price.
 */
@Controller('routing/model-sizes')
export class ModelSizeController {
  constructor(private readonly service: RouterModelsService) {}

  @Get()
  @RequirePermissions(Permission.MODEL_USE_ALLOWED)
  async list(): Promise<ModelSizeCatalog> {
    return this.service.listModelSizes();
  }
}
