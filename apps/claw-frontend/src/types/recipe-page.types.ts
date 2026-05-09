import type { Recipe, RecipeRunDetail } from './recipe.types';

export type UseRecipesPageReturn = {
  recipes: Recipe[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  handleDelete: (id: string) => void;
  isDeleting: boolean;
};

export type UseRecipeRunDetailPageReturn = {
  run: RecipeRunDetail | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  handleCancel: () => void;
  isCancelling: boolean;
};
