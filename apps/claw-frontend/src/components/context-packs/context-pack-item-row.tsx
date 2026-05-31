import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CONTEXT_PACK_ITEM_TYPE_LABELS } from '@/constants';
import type { ContextPackItemType } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ContextPackItemRowProps } from '@/types';
import { getContextPackItemTypeIcon, getContextPackItemTypeTone } from '@/utilities';

export function ContextPackItemRow({
  item,
  index,
  isFirst,
  isLast,
  isDragSupported,
  isDragging,
  isDragTarget,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isUpdatePending,
  isRemovePending,
}: ContextPackItemRowProps) {
  const { t } = useTranslation();
  const Icon = getContextPackItemTypeIcon(item.type);
  const tone = getContextPackItemTypeTone(item.type);
  const typeLabel =
    t(CONTEXT_PACK_ITEM_TYPE_LABELS[item.type as ContextPackItemType]) ?? item.type;

  return (
    <Card
      draggable={isDragSupported}
      onDragStart={isDragSupported ? () => onDragStart(index) : undefined}
      onDragOver={isDragSupported ? (e) => onDragOver(e, index) : undefined}
      onDragLeave={isDragSupported ? onDragLeave : undefined}
      onDrop={isDragSupported ? (e) => onDrop(e, index) : undefined}
      onDragEnd={isDragSupported ? onDragEnd : undefined}
      className={cn(
        'transition-all',
        isDragging && 'opacity-40',
        isDragTarget && 'border-primary ring-2 ring-primary/20',
      )}
    >
      <CardContent className="flex items-start gap-3 p-4">
        {isDragSupported ? (
          <div
            className="flex h-8 w-5 shrink-0 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
            aria-hidden="true"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        ) : null}
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
            tone,
          )}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </div>
        {!isDragSupported ? (
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={isFirst || isUpdatePending}
              onClick={onMoveUp}
              aria-label={t('common.previous')}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={isLast || isUpdatePending}
              onClick={onMoveDown}
              aria-label={t('common.next')}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {typeLabel}
            </Badge>
            <span className="text-xs text-muted-foreground">#{item.sortOrder}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm">
            {item.content ?? (item.fileId ? `${t('context.fileId')}: ${item.fileId}` : '—')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
          onClick={onRemove}
          disabled={isRemovePending}
          aria-label={t('common.delete')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
