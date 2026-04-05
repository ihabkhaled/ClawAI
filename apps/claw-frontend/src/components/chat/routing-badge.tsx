import { Badge } from '@/components/ui/badge';
import { ROUTING_MODE_LABELS } from '@/constants';
import { cn } from '@/lib/utils';
import type { RoutingBadgeProps } from '@/types';

export function RoutingBadge({ mode, className }: RoutingBadgeProps) {
  return (
    <Badge variant="secondary" className={cn('text-xs', className)}>
      {ROUTING_MODE_LABELS[mode]}
    </Badge>
  );
}
