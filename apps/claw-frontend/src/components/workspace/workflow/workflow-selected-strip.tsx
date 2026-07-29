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
    <div className="border-border bg-muted/30 rounded-md border p-3">
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
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={t('workflow.object.remove')}
              className="hover:text-destructive ml-0.5 rounded-full"
            >
              <X className="size-3" aria-hidden="true" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
