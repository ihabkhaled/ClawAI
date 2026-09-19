import { Body, Controller, Get, Param, ParseEnumPipe, Put } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';

import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import { AssistantModelRole } from '../../../generated/prisma';
import {
  type ReplaceAssistantModelsDto,
  replaceAssistantModelsSchema,
} from '../dto/replace-assistant-models.dto';
import { AssistantModelService } from '../services/assistant-model.service';
import type { AssistantModelRecord } from '../types/assistant-model.types';

/**
 * Admin surface for the models that do jobs beside routing.
 *
 * Same guard as the router configuration next door: these are global policy,
 * not per-user data. No new permission — ADMIN_ROUTING_MANAGE already covers
 * "who may change how routing behaves", and choosing the research gate's model
 * is exactly that.
 */
@Controller('routing/assistant-models')
@Roles(UserRole.ADMIN, UserRole.OPERATOR)
@RequirePermissions(Permission.ADMIN_ROUTING_MANAGE)
export class AssistantModelsController {
  constructor(private readonly service: AssistantModelService) {}

  @Get(':role')
  async list(
    @Param('role', new ParseEnumPipe(AssistantModelRole)) role: AssistantModelRole,
  ): Promise<AssistantModelRecord[]> {
    return this.service.listByRole(role);
  }

  /** Declarative replace: the body is the whole desired list, in order. */
  @Put(':role')
  async replace(
    @Param('role', new ParseEnumPipe(AssistantModelRole)) role: AssistantModelRole,
    @Body(new ZodValidationPipe(replaceAssistantModelsSchema)) dto: ReplaceAssistantModelsDto,
  ): Promise<AssistantModelRecord[]> {
    return this.service.replaceRole(role, dto.entries);
  }
}
