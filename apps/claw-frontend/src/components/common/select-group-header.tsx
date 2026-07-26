import type { ReactElement } from 'react';

import { SelectLabel } from '@/components/ui/select';
import { SELECT_GROUP_HEADER_CLASSES } from '@/constants/select-group-header.constants';
import { cn } from '@/lib/utils';
import type { SelectGroupHeaderProps } from '@/types/component.types';

/**
 * A group heading inside a Select dropdown.
 *
 * The shadcn `SelectLabel` default renders at the same size and nearly the same
 * weight as an option, so in a long grouped list — "Ollama (Local)" above ten
 * models — a heading reads as just another row you can pick. This gives it a
 * tinted band, a heavier weight and a larger size so the hierarchy is obvious
 * at a glance.
 *
 * `select-none` is part of the fix, not decoration: dragging across a heading
 * would otherwise paint it with the OS text-selection highlight, which looks
 * exactly like a chosen option.
 *
 * Wrapping rather than editing `components/ui/select.tsx` keeps the generated
 * shadcn primitive untouched, so re-running the generator cannot silently
 * revert this.
 */
export function SelectGroupHeader({ children, className }: SelectGroupHeaderProps): ReactElement {
  return (
    <SelectLabel className={cn(SELECT_GROUP_HEADER_CLASSES, className)}>{children}</SelectLabel>
  );
}
