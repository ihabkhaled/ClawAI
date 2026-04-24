import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { WorkflowSelectedStripProps } from '@/types/component.types';

export function WorkflowSelectedStrip({
  selectedItems,
  onRemove,
  onClear,
  t,
}: WorkflowSelectedStripProps): React.ReactElement {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">
          {selectedItems.length} {t('workflow.object.selected_count')}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          {t('workflow.object.clear_all')}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {selectedItems.map((item) => (
          <Badge key={item.id} variant="secondary" className="flex items-center gap-1 text-xs">
            <span className="max-w-[160px] truncate">{item.title}</span>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={t('workflow.object.remove')}
              className="ml-0.5 rounded-full hover:text-destructive"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
