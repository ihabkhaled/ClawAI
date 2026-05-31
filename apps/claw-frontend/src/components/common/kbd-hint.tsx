'use client';

import { cn } from '@/lib/utils';
import type { KbdHintProps } from '@/types';

// Small visual hint for a keyboard shortcut next to a trigger button (e.g.
// "Search ⌘K"). Styled via the `.kbd-hint` component class in globals.css.
// Pass `keys` as an array — they render as inline-flex glyphs separated by
// a hair-space so each key feels like its own pip.
export function KbdHint({ keys, className }: KbdHintProps): React.ReactElement {
  // Render a single string so React doesn't need keys per glyph — the
  // .kbd-hint class uses `gap` to space the children, but for a static label
  // like "⌘K" we just emit one text node and avoid the warning entirely.
  // If a caller needs visual separators between keys they can pass the
  // already-joined string (e.g. ['⌘', '⇧', 'P']).
  return (
    <span className={cn('kbd-hint', className)} aria-hidden>
      {keys.join('')}
    </span>
  );
}
