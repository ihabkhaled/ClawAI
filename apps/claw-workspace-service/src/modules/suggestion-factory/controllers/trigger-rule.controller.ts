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
import { UserRole } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type CreateTriggerRuleDto,
  createTriggerRuleSchema,
  type UpdateTriggerRuleDto,
  updateTriggerRuleSchema,
} from '../dto/trigger-rule.dto';
import { SuggestionTriggerRuleRepository } from '../repositories/suggestion-trigger-rule.repository';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { SuggestionTriggerRule } from '../../../generated/prisma';

@Controller('workspace/suggestion-rules')
export class TriggerRuleController {
  constructor(private readonly repo: SuggestionTriggerRuleRepository) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async list(): Promise<SuggestionTriggerRule[]> {
    return this.repo.listAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createTriggerRuleSchema)) dto: CreateTriggerRuleDto,
  ): Promise<SuggestionTriggerRule> {
    return this.repo.createCustom(dto, user.id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTriggerRuleSchema)) dto: UpdateTriggerRuleDto,
  ): Promise<SuggestionTriggerRule> {
    return this.repo.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<void> {
    await this.repo.deleteById(id);
  }
}
