import { Minus, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { WorkflowObjectRowProps } from '@/types/component.types';

export function WorkflowObjectRow({
  object,
  isSelected,
  onAdd,
  onRemove,
  t,
}: WorkflowObjectRowProps): React.ReactElement {
  const date =
    object.externalUpdatedAt !== null
      ? new Date(object.externalUpdatedAt).toLocaleDateString()
      : '';

  return (
    <div className="flex w-full items-center gap-3 rounded-md border border-border p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{object.title}</span>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {object.provider}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>
      {isSelected ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(object.id)}
          aria-label={t('workflow.object.remove')}
        >
          <Minus className="size-3.5" aria-hidden="true" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onAdd(object)}
          aria-label={t('workflow.object.add')}
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
