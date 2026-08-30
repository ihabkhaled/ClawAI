import {
  BookOpen,
  Brain,
  Code,
  FileCode,
  Link,
  Paperclip,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';

import { ContextPackItemTypeV2 } from '@/enums';

// `ContextPackItemTypeV2` is the ONLY item enum. A frontend-only
// `ContextPackItemType` (NOTE/INSTRUCTION/FILE_REFERENCE) used to shadow it —
// values no migration ever declared, so the database could not hold one and no
// API could ever return one. It was nonetheless what these helpers switched on
// and what the label map was keyed by, so every real item missed every case.
// The icon and tone helpers have a default and degraded silently; the label
// lookup was a bare `Record` index, returned `undefined`, and crashed the pack
// page inside `t()`. All three take a default now, and the dead enum is gone.

// Maps a context pack item type to its lucide icon. Unknown types render with a
// generic BookOpen so the list stays visually consistent.
export function getContextPackItemTypeIcon(type: string): LucideIcon {
  switch (type) {
    case ContextPackItemTypeV2.TEXT:
      return StickyNote;
    case ContextPackItemTypeV2.FILE:
      return Paperclip;
    case ContextPackItemTypeV2.URL:
      return Link;
    case ContextPackItemTypeV2.MARKDOWN:
      return FileCode;
    case ContextPackItemTypeV2.SNIPPET:
      return Code;
    case ContextPackItemTypeV2.MEMORY_REF:
      return Brain;
    default:
      return BookOpen;
  }
}

// Tailwind tone classes used for the icon tile background + foreground. Uses
// the same semantic palette pattern as connector provider tiles so the page
// feels cohesive in light + dark mode.
export function getContextPackItemTypeTone(type: string): string {
  switch (type) {
    case ContextPackItemTypeV2.TEXT:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case ContextPackItemTypeV2.FILE:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case ContextPackItemTypeV2.URL:
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
    case ContextPackItemTypeV2.MARKDOWN:
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case ContextPackItemTypeV2.SNIPPET:
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    case ContextPackItemTypeV2.MEMORY_REF:
      return 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/**
 * The translation key for a type, or `null` when there is no key for it.
 *
 * Returning `null` rather than a key is deliberate: `t()` renders a missing key
 * as the raw key string, so inventing one would put `context.typeUnknown` in
 * front of a user. The caller falls back to the raw type instead, which is at
 * least true.
 */
export function getContextPackItemTypeLabelKey(type: string): string | null {
  switch (type) {
    case ContextPackItemTypeV2.TEXT:
      return 'context.typeText';
    case ContextPackItemTypeV2.FILE:
      return 'context.typeFile';
    case ContextPackItemTypeV2.URL:
      return 'context.typeUrl';
    case ContextPackItemTypeV2.MARKDOWN:
      return 'context.typeMarkdown';
    case ContextPackItemTypeV2.SNIPPET:
      return 'context.typeSnippet';
    case ContextPackItemTypeV2.MEMORY_REF:
      return 'context.typeMemoryRef';
    default:
      return null;
  }
}
