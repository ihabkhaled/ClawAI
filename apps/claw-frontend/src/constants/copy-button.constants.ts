import { ComponentSize } from '@/enums';

// Component-size enum → shadcn Button size variant. `CopyButton` is an
// icon-only control, so the mapping picks the smaller icon-* variants
// added in the Phase 1 button refresh.
export type CopyButtonSizeVariant = 'icon' | 'icon-sm' | 'icon-xs';

export const COPY_BUTTON_SIZE_TO_BUTTON_SIZE: Record<ComponentSize, CopyButtonSizeVariant> = {
  [ComponentSize.SM]: 'icon-xs',
  [ComponentSize.MD]: 'icon-sm',
  [ComponentSize.LG]: 'icon',
};

export const COPY_BUTTON_SIZE_TO_ICON_CLASS: Record<ComponentSize, string> = {
  [ComponentSize.SM]: 'h-3 w-3',
  [ComponentSize.MD]: 'h-3.5 w-3.5',
  [ComponentSize.LG]: 'h-4 w-4',
};
