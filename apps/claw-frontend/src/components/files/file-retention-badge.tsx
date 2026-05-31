import { Badge } from '@/components/ui/badge';
import { useFileRetentionBadge } from '@/hooks/files/use-file-retention-badge';
import { cn } from '@/lib/utils';
import type { FileRetentionBadgeProps } from '@/types';

export function FileRetentionBadge({ retentionExpiresAt }: FileRetentionBadgeProps) {
  const { shouldRender, label, toneClass } = useFileRetentionBadge(retentionExpiresAt);

  if (!shouldRender) {
    return null;
  }

  return (
    <Badge variant="outline" className={cn('shrink-0 text-xs', toneClass)}>
      {label}
    </Badge>
  );
}
