import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser, Roles } from '@claw/shared-auth';
import { Permission, UserRole } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type CreateTriggerRuleDto,
  createTriggerRuleSchema,
  type UpdateTriggerRuleDto,
  updateTriggerRuleSchema,
} from '../dto/trigger-rule.dto';
import { SuggestionTriggerRuleService } from '../services/suggestion-trigger-rule.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { SuggestionTriggerRule } from '../../../generated/prisma';

@Controller('workspace/suggestion-rules')
@RequirePermissions(Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE)
export class TriggerRuleController {
  constructor(private readonly service: SuggestionTriggerRuleService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async list(): Promise<SuggestionTriggerRule[]> {
    return this.service.list();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createTriggerRuleSchema)) dto: CreateTriggerRuleDto,
  ): Promise<SuggestionTriggerRule> {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTriggerRuleSchema)) dto: UpdateTriggerRuleDto,
  ): Promise<SuggestionTriggerRule> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<void> {
    await this.service.deleteById(id);
  }
}
