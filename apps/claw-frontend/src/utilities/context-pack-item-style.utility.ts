import {
  BookOpen,
  Lightbulb,
  Paperclip,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';

import { ContextPackItemType } from '@/enums';

// Maps a ContextPackItemType to its lucide icon. Unknown types render with a
// generic BookOpen so the list stays visually consistent.
export function getContextPackItemTypeIcon(type: string): LucideIcon {
  switch (type) {
    case ContextPackItemType.NOTE:
      return StickyNote;
    case ContextPackItemType.INSTRUCTION:
      return Lightbulb;
    case ContextPackItemType.FILE_REFERENCE:
      return Paperclip;
    default:
      return BookOpen;
  }
}

// Tailwind tone classes used for the icon tile background + foreground. Uses
// the same semantic palette pattern as connector provider tiles so the page
// feels cohesive in light + dark mode.
export function getContextPackItemTypeTone(type: string): string {
  switch (type) {
    case ContextPackItemType.NOTE:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case ContextPackItemType.INSTRUCTION:
      return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400';
    case ContextPackItemType.FILE_REFERENCE:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
