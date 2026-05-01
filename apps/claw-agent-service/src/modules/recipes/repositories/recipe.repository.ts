import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { Prisma, Recipe } from '../../../generated/prisma';
import type { ListRecipesQueryDto } from '../dto/list-recipes-query.dto';
import type { PaginatedRecipes } from '../types/paginated-recipes.types';

/**
 * Pure data access for `Recipe`. No business logic, no throw — services
 * decide what to do with null returns.
 */
@Injectable()
export class RecipeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.RecipeCreateInput): Promise<Recipe> {
    return this.prisma.recipe.create({ data });
  }

  async findByIdForUser(id: string, userId: string): Promise<Recipe | null> {
    return this.prisma.recipe.findFirst({ where: { id, userId } });
  }

  async findByNameForUser(name: string, userId: string): Promise<Recipe | null> {
    return this.prisma.recipe.findFirst({ where: { name, userId } });
  }

  async update(id: string, data: Prisma.RecipeUpdateInput): Promise<Recipe> {
    return this.prisma.recipe.update({ where: { id }, data });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.recipe.delete({ where: { id } });
  }

  async list(query: ListRecipesQueryDto, userId: string): Promise<PaginatedRecipes> {
    const where: Prisma.RecipeWhereInput = { userId };
    if (query.isEnabled !== undefined) {
      where.isEnabled = query.isEnabled;
    }
    if (query.search !== undefined && query.search.length > 0) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      this.prisma.recipe.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.recipe.count({ where }),
    ]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }
}
