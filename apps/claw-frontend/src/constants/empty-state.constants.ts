import { EmptyStateVariant } from '@/enums/empty-state-variant.enum';

// Visual variants for the EmptyState primitive. Each map keys the
// EmptyStateVariant enum value; lookup is exhaustive at the type level so a
// new variant added later must be wired through every map.

export const EMPTY_STATE_VARIANT_CLASSES: Record<EmptyStateVariant, string> = {
  [EmptyStateVariant.Default]:
    'min-h-[400px] rounded-lg border border-dashed p-8',
  [EmptyStateVariant.Compact]:
    'min-h-[160px] rounded-md p-4',
  [EmptyStateVariant.Page]:
    'min-h-[60vh] rounded-xl border border-dashed p-12',
};

export const EMPTY_STATE_ICON_WRAP_CLASSES: Record<EmptyStateVariant, string> = {
  [EmptyStateVariant.Default]: 'h-16 w-16 rounded-full',
  [EmptyStateVariant.Compact]: 'h-10 w-10 rounded-md',
  [EmptyStateVariant.Page]: 'h-20 w-20 rounded-full',
};

export const EMPTY_STATE_ICON_CLASSES: Record<EmptyStateVariant, string> = {
  [EmptyStateVariant.Default]: 'h-8 w-8',
  [EmptyStateVariant.Compact]: 'h-5 w-5',
  [EmptyStateVariant.Page]: 'h-10 w-10',
};

export const EMPTY_STATE_TITLE_CLASSES: Record<EmptyStateVariant, string> = {
  [EmptyStateVariant.Default]: 'mt-4 text-lg font-semibold',
  [EmptyStateVariant.Compact]: 'mt-3 text-sm font-medium',
  [EmptyStateVariant.Page]: 'mt-6 text-2xl font-semibold tracking-tight',
};

export const EMPTY_STATE_DESCRIPTION_CLASSES: Record<EmptyStateVariant, string> = {
  [EmptyStateVariant.Default]: 'mt-2 max-w-sm text-sm text-muted-foreground',
  [EmptyStateVariant.Compact]: 'mt-1 max-w-xs text-xs text-muted-foreground',
  [EmptyStateVariant.Page]: 'mt-3 max-w-md text-base text-muted-foreground',
};
