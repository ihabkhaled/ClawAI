import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import { ModelCostSource } from '../../../generated/prisma';
import {
  type EstimateModelCostDto,
  estimateModelCostSchema,
  type PriceModelCostDto,
  priceModelCostSchema,
  type PublishModelCostDto,
  publishModelCostSchema,
} from '../dto/publish-model-cost.dto';
import { ModelCostCatalogService } from '../services/model-cost-catalog.service';
import { ModelCostService } from '../services/model-cost.service';
import { type ModelCostSnapshot } from '../types/model-cost.types';
import { type ModelCostCatalogRow } from '../types/model-cost-catalog.types';
import { type ModelCostQuote } from '../types/model-cost-quote.types';

@Controller('router-models/costs')
export class ModelCostController {
  constructor(
    private readonly service: ModelCostService,
    private readonly catalog: ModelCostCatalogService,
  ) {}

  @Get()
  async listActive(): Promise<ModelCostSnapshot[]> {
    return this.service.listActive();
  }

  // Every model in the registry with its RESOLVED rate, plus how that rate was
  // reached. Gated exactly like the publish below, not like the read above:
  // it exposes the full provider rate card in one response, and a rate is a
  // margin input (rule 37).
  @Get('catalog')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  async listCatalog(): Promise<ModelCostCatalogRow[]> {
    return this.catalog.listCatalog();
  }

  @Get(':provider/:model')
  async get(
    @Param('provider') provider: string,
    @Param('model') model: string,
  ): Promise<ModelCostSnapshot> {
    return this.service.getSnapshot(provider, model);
  }

  @Get(':provider/:model/versions')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  async versions(
    @Param('provider') provider: string,
    @Param('model') model: string,
  ): Promise<ModelCostSnapshot[]> {
    return this.service.listVersions(provider, model);
  }

  @Post('estimate')
  async estimate(
    @Body(new ZodValidationPipe(estimateModelCostSchema)) dto: EstimateModelCostDto,
  ): Promise<ModelCostQuote> {
    return this.service.estimate(dto);
  }

  @Post('price')
  async price(
    @Body(new ZodValidationPipe(priceModelCostSchema)) dto: PriceModelCostDto,
  ): Promise<ModelCostQuote> {
    return this.service.price({ provider: dto.provider, modelKey: dto.modelKey, raw: dto });
  }

  // Publishing marks the rates as an ADMIN override, which pins them: automated
  // sync will refuse to overwrite them until an administrator clears the pin.
  @Post()
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  async publish(
    @Body(new ZodValidationPipe(publishModelCostSchema)) dto: PublishModelCostDto,
  ): Promise<{ version: number }> {
    const version = await this.service.publishFromDto(dto, ModelCostSource.ADMIN_OVERRIDE, true);
    return { version };
  }
}
