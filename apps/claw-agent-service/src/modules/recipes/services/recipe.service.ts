import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { RecipeRepository } from '../repositories/recipe.repository';
import { Prisma, type Recipe } from '../../../generated/prisma';
import type { CreateRecipeDto } from '../dto/create-recipe.dto';
import type { ListRecipesQueryDto } from '../dto/list-recipes-query.dto';
import type { UpdateRecipeDto } from '../dto/update-recipe.dto';
import type { PaginatedRecipes } from '../types/paginated-recipes.types';

/**
 * Stream 13 — Recipe CRUD service. Owns the user-facing recipe library
 * lifecycle. Recipe execution / runs are NOT yet implemented; that lands
 * in a follow-up stream once the event-driven runner design is reviewed.
 */
@Injectable()
export class RecipeService {
  private readonly logger = new Logger(RecipeService.name);

  constructor(private readonly repo: RecipeRepository) {}

  async create(userId: string, dto: CreateRecipeDto): Promise<Recipe> {
    this.logger.debug(`create: userId=${userId} name=${dto.name}`);
    const existing = await this.repo.findByNameForUser(dto.name, userId);
    if (existing !== null) {
      throw new BusinessException(
        'agent.recipe.duplicate_name',
        'RECIPE_NAME_TAKEN',
        HttpStatus.CONFLICT,
        { name: dto.name },
      );
    }
    return this.repo.create({
      userId,
      name: dto.name,
      description: dto.description ?? null,
      dsl: dto.dsl as Prisma.InputJsonValue,
      isEnabled: dto.isEnabled,
      metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
    });
  }

  async getById(userId: string, id: string): Promise<Recipe> {
    this.logger.debug(`getById: userId=${userId} id=${id}`);
    const recipe = await this.repo.findByIdForUser(id, userId);
    if (recipe === null) {
      throw new EntityNotFoundException('Recipe', id);
    }
    return recipe;
  }

  async list(userId: string, query: ListRecipesQueryDto): Promise<PaginatedRecipes> {
    this.logger.debug(`list: userId=${userId} page=${query.page}`);
    return this.repo.list(query, userId);
  }

  async update(userId: string, id: string, dto: UpdateRecipeDto): Promise<Recipe> {
    this.logger.debug(`update: userId=${userId} id=${id}`);
    await this.assertOwned(userId, id);
    return this.repo.update(id, this.toUpdateInput(dto));
  }

  async delete(userId: string, id: string): Promise<void> {
    this.logger.debug(`delete: userId=${userId} id=${id}`);
    await this.assertOwned(userId, id);
    await this.repo.deleteById(id);
    this.logger.log(`delete: recipe ${id} removed`);
  }

  private async assertOwned(userId: string, id: string): Promise<Recipe> {
    const recipe = await this.repo.findByIdForUser(id, userId);
    if (recipe === null) {
      throw new EntityNotFoundException('Recipe', id);
    }
    return recipe;
  }

  private toUpdateInput(dto: UpdateRecipeDto): Prisma.RecipeUpdateInput {
    const out: Prisma.RecipeUpdateInput = {};
    if (dto.name !== undefined) out.name = dto.name;
    if (dto.description !== undefined) out.description = dto.description;
    if (dto.isEnabled !== undefined) out.isEnabled = dto.isEnabled;
    if (dto.metadata !== undefined) out.metadata = dto.metadata as Prisma.InputJsonValue;
    if (dto.dsl !== undefined) {
      out.dsl = dto.dsl as Prisma.InputJsonValue;
      out.version = { increment: 1 };
    }
    return out;
  }
}
