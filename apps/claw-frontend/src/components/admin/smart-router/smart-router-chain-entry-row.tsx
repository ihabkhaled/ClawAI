import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  SMART_ROUTER_PROVIDER_LABEL_KEYS,
  SMART_ROUTER_ROLE_LABEL_KEYS,
} from '@/constants/smart-router-admin.constants';
import { cn } from '@/lib/utils';
import type { SmartRouterChainEntryRowProps } from '@/types/smart-router-admin.types';

export function SmartRouterChainEntryRow({
  entry,
  index,
  isFirst,
  isLast,
  isEditable,
  isDragSupported,
  isDragging,
  isDragTarget,
  isUpdatePending,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  t,
}: SmartRouterChainEntryRowProps): React.ReactElement {
  const canDrag = isEditable && isDragSupported;

  return (
    <Card
      draggable={canDrag}
      onDragStart={canDrag ? () => onDragStart(index) : undefined}
      onDragOver={canDrag ? (event) => onDragOver(event, index) : undefined}
      onDragLeave={canDrag ? onDragLeave : undefined}
      onDrop={canDrag ? (event) => onDrop(event, index) : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      className={cn(
        'transition-all',
        isDragging && 'opacity-40',
        isDragTarget && 'border-primary ring-primary/20 ring-2',
      )}
    >
      <CardContent className="flex items-start gap-3 p-4">
        {canDrag ? (
          <div
            className="text-muted-foreground flex h-8 w-5 shrink-0 cursor-grab items-center justify-center active:cursor-grabbing"
            aria-hidden="true"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        ) : null}
        {isEditable && !isDragSupported ? (
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
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {t('smartRouterAdmin.entryRow.orderPrefix')} #{entry.order}
            </span>
            <Badge variant="outline">{t(SMART_ROUTER_PROVIDER_LABEL_KEYS[entry.provider])}</Badge>
            <Badge variant="secondary">{t(SMART_ROUTER_ROLE_LABEL_KEYS[entry.role])}</Badge>
            {!entry.enabled ? (
              <Badge variant="destructive">{t('smartRouterAdmin.entryRow.disabledBadge')}</Badge>
            ) : null}
          </div>
          <p className="truncate text-sm font-medium">{entry.modelAlias}</p>
          <p className="text-muted-foreground text-xs">
            {entry.attemptTimeoutMs}
            {t('smartRouterAdmin.entryRow.timeoutSuffix')} · {entry.retries}x
          </p>
        </div>
        {isEditable ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-8 w-8 shrink-0"
            onClick={onRemove}
            disabled={isUpdatePending}
            aria-label={t('common.delete')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
