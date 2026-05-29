import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import {
  type UpdateModelIntelligenceDto,
  updateModelIntelligenceSchema,
} from '../dto/update-model-intelligence.dto';
import { ModelIntelligenceService } from '../services/model-intelligence.service';
import { type ResolvedModelIntelligence } from '../types/model-intelligence.types';

@Controller('router-models/intelligence')
export class ModelIntelligenceController {
  constructor(private readonly service: ModelIntelligenceService) {}

  @Get(':provider/:model')
  async get(
    @Param('provider') provider: string,
    @Param('model') model: string,
  ): Promise<ResolvedModelIntelligence> {
    return this.service.getIntelligence(provider, model);
  }

  @Patch(':provider/:model')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  async patch(
    @Param('provider') provider: string,
    @Param('model') model: string,
    @Body(new ZodValidationPipe(updateModelIntelligenceSchema))
    dto: UpdateModelIntelligenceDto,
  ): Promise<ResolvedModelIntelligence> {
    return this.service.patchIntelligence(provider, model, dto);
  }

  @Post(':provider/:model/reset')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  @HttpCode(HttpStatus.OK)
  async reset(
    @Param('provider') provider: string,
    @Param('model') model: string,
  ): Promise<ResolvedModelIntelligence> {
    return this.service.resetOverride(provider, model);
  }
}
