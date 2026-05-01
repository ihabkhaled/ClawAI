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
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type CreateRecipeDto,
  createRecipeSchema,
} from '../dto/create-recipe.dto';
import {
  type ListRecipesQueryDto,
  listRecipesQuerySchema,
} from '../dto/list-recipes-query.dto';
import {
  type UpdateRecipeDto,
  updateRecipeSchema,
} from '../dto/update-recipe.dto';
import { RecipeService } from '../services/recipe.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { Recipe } from '../../../generated/prisma';
import type { PaginatedRecipes } from '../types/paginated-recipes.types';

/**
 * Stream 13 — user-facing recipe CRUD. 3-line methods only:
 * extract, call ONE service method, return.
 */
@Controller('agent/recipes')
export class RecipeController {
  constructor(private readonly service: RecipeService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createRecipeSchema)) dto: CreateRecipeDto,
  ): Promise<Recipe> {
    return this.service.create(user.id, dto);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listRecipesQuerySchema)) query: ListRecipesQueryDto,
  ): Promise<PaginatedRecipes> {
    return this.service.list(user.id, query);
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Recipe> {
    return this.service.getById(user.id, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRecipeSchema)) dto: UpdateRecipeDto,
  ): Promise<Recipe> {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.delete(user.id, id);
  }
}
