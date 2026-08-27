import { Check, Pencil, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';
import type { UseEditableTitleReturn } from '@/types';

export function EditableTitle({
  title,
  editableTitle,
}: {
  title: string;
  editableTitle: UseEditableTitleReturn;
}): React.ReactElement {
  const { t } = useTranslation();
  if (editableTitle.isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={editableTitle.editValue}
          onChange={(e) => editableTitle.setEditValue(e.target.value)}
          onKeyDown={editableTitle.handleKeyDown}
          onBlur={editableTitle.saveTitle}
          className="h-9 max-w-xs text-lg font-bold"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          disabled={editableTitle.isPending}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={editableTitle.saveTitle}
          disabled={editableTitle.isPending}
          aria-label={t('common.save')}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={editableTitle.cancelEditing}
          disabled={editableTitle.isPending}
          aria-label={t('common.cancel')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <h1 className="clamp-title truncate text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h1>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground h-8 w-8"
        onClick={editableTitle.startEditing}
        aria-label={t('common.edit')}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
}
