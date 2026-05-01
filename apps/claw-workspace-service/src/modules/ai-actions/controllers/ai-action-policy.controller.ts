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
  type CreateAiActionPolicyDto,
  createAiActionPolicySchema,
  type UpdateAiActionPolicyDto,
  updateAiActionPolicySchema,
} from '../dto/ai-action-policy.dto';
import { AiActionPolicyService } from '../services/ai-action-policy.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { AiActionPolicy } from '../../../generated/prisma';

@Controller('workspace/ai-actions/policies')
export class AiActionPolicyController {
  constructor(private readonly service: AiActionPolicyService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async list(): Promise<AiActionPolicy[]> {
    return this.service.list();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async getOne(@Param('id') id: string): Promise<AiActionPolicy> {
    return this.service.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createAiActionPolicySchema)) dto: CreateAiActionPolicyDto,
  ): Promise<AiActionPolicy> {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAiActionPolicySchema)) dto: UpdateAiActionPolicyDto,
  ): Promise<AiActionPolicy> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<void> {
    await this.service.deleteById(id);
  }
}
