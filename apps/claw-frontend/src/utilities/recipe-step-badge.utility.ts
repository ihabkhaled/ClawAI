import { RecipeRunStepStatus } from '@/enums/recipe-run-step-status.enum';

type BadgeVariant = 'default' | 'destructive' | 'outline';

export function resolveStepBadgeVariant(status: RecipeRunStepStatus | string): BadgeVariant {
  if (status === RecipeRunStepStatus.SUCCEEDED) {
    return 'default';
  }
  if (status === RecipeRunStepStatus.FAILED) {
    return 'destructive';
  }
  return 'outline';
}
