import type { Recipe } from '../../../generated/prisma';

export type PaginatedRecipes = {
  data: Recipe[];
  total: number;
  page: number;
  pageSize: number;
};
