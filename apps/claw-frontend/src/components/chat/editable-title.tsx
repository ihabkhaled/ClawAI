import { Check, Pencil, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { UseEditableTitleReturn } from '@/types';

/**
 * The thread title, in place, with an inline rename.
 *
 * Sized for a header row, not a page banner. It used to render at
 * `text-2xl`/`sm:text-3xl` and clamp to two lines, which alone made a compact
 * chat header impossible — see the deviation recorded in
 * `docs/02-business-product/chat-thread-page-spec.md`. It now holds one line
 * and truncates, carrying the full title in a `title` attribute so a long one
 * is still readable on hover without the header growing a second row.
 *
 * `sm:text-base` rather than `sm:text-lg`: it is the only thing left on the
 * header now that the actions moved to the rail, and a heading that is the
 * tallest element on a row it shares with 32px buttons is setting the row's
 * height by itself. Mobile keeps `text-base`, where the 44px touch floor sets
 * the height anyway and shrinking the title would buy nothing.
 */
export function EditableTitle({
  title,
  editableTitle,
}: {
  title: string;
  editableTitle: UseEditableTitleReturn;
}): React.ReactElement {
  if (editableTitle.isEditing) {
    return (
      <div className="flex min-w-0 items-center gap-1">
        <Input
          value={editableTitle.editValue}
          onChange={(e) => editableTitle.setEditValue(e.target.value)}
          onKeyDown={editableTitle.handleKeyDown}
          onBlur={editableTitle.saveTitle}
          className="h-8 max-w-xs text-base font-semibold"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          disabled={editableTitle.isPending}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={editableTitle.saveTitle}
          disabled={editableTitle.isPending}
          aria-label={editableTitle.saveLabel}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={editableTitle.cancelEditing}
          disabled={editableTitle.isPending}
          aria-label={editableTitle.cancelLabel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group/title flex min-w-0 items-center gap-1">
      <h1
        title={title}
        className="clamp-title truncate text-base leading-tight font-semibold tracking-tight"
      >
        {title}
      </h1>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-foreground shrink-0 opacity-70 transition-opacity group-hover/title:opacity-100 focus-visible:opacity-100"
        onClick={editableTitle.startEditing}
        aria-label={editableTitle.editLabel}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
