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
  Query,
} from '@nestjs/common';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type AuthenticatedUser } from '../../../common/types';
import {
  type CreatePromptTemplateDto,
  createPromptTemplateSchema,
  type ListPromptTemplatesQueryDto,
  listPromptTemplatesQuerySchema,
  type PromptTemplateParamDto,
  promptTemplateParamSchema,
  type UpdatePromptTemplateDto,
  updatePromptTemplateSchema,
} from '../dto/prompt-library.dto';
import { PromptLibraryService } from '../services/prompt-library.service';
import {
  type PromptTemplateListResult,
  type PromptTemplateView,
} from '../types/prompt-library.types';

/** The caller's own prompt library. Identity comes only from `@CurrentUser`. */
@Controller('chat-prompt-templates')
export class PromptLibraryController {
  constructor(private readonly library: PromptLibraryService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listPromptTemplatesQuerySchema))
    query: ListPromptTemplatesQueryDto,
  ): Promise<PromptTemplateListResult> {
    return this.library.list(user.id, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createPromptTemplateSchema)) dto: CreatePromptTemplateDto,
  ): Promise<PromptTemplateView> {
    return this.library.create(user.id, dto);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(promptTemplateParamSchema)) params: PromptTemplateParamDto,
  ): Promise<PromptTemplateView> {
    return this.library.get(user.id, params.id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(promptTemplateParamSchema)) params: PromptTemplateParamDto,
    @Body(new ZodValidationPipe(updatePromptTemplateSchema)) dto: UpdatePromptTemplateDto,
  ): Promise<PromptTemplateView> {
    return this.library.update(user.id, params.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(promptTemplateParamSchema)) params: PromptTemplateParamDto,
  ): Promise<void> {
    await this.library.remove(user.id, params.id);
  }

  @Post(':id/use')
  @HttpCode(HttpStatus.OK)
  async use(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(promptTemplateParamSchema)) params: PromptTemplateParamDto,
  ): Promise<PromptTemplateView> {
    return this.library.use(user.id, params.id);
  }
}
