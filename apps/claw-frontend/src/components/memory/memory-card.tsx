import { ExternalLink, MoreVertical, Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { MEMORY_TYPE_LABELS, MEMORY_TYPE_COLORS, ROUTES } from '@/constants';
import { cn } from '@/lib/utils';
import type { MemoryCardProps } from '@/types';
import { formatShortDateTime } from '@/utilities';

export function MemoryCard({
  memory,
  onToggle,
  onEdit,
  onDelete,
  isTogglePending,
}: MemoryCardProps) {
  const typeLabel = MEMORY_TYPE_LABELS[memory.type] ?? memory.type;
  const typeColor =
    MEMORY_TYPE_COLORS[memory.type] ?? 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800';

  return (
    <Card className={cn('transition-colors', !memory.isEnabled && 'opacity-60')}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn('text-xs', typeColor)}>
            {typeLabel}
          </Badge>
          {memory.sourceThreadId ? (
            <a
              href={ROUTES.CHAT_THREAD(memory.sourceThreadId)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              Source
            </a>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={memory.isEnabled}
            onCheckedChange={() => onToggle(memory.id)}
            disabled={isTogglePending}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(memory)}>
                <Pencil className="me-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(memory.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="me-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">{memory.content}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          Updated {formatShortDateTime(memory.updatedAt)}
        </p>
      </CardContent>
    </Card>
  );
}
