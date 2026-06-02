import { Globe, MessageSquare } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { WorkflowKind } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { WorkflowBadgeProps } from '@/types';

export function WorkflowBadge({ workflow, searchFirst }: WorkflowBadgeProps) {
  const { t } = useTranslation();

  if (workflow === null || workflow === undefined) {
    return null;
  }

  if (workflow === WorkflowKind.SEARCH_FIRST) {
    const searchDegraded = searchFirst !== undefined && searchFirst.applied === false;
    const tooltip = searchDegraded
      ? t('chat.workflow.searchDegraded')
      : t('chat.workflow.tooltipSearchFirst');
    return (
      <Badge
        variant="outline"
        title={tooltip}
        className={cn(
          'gap-1 text-xs',
          searchDegraded
            ? 'border-warning/50 text-warning'
            : 'border-success/50 text-success',
        )}
      >
        <Globe className="h-3 w-3" />
        {t('chat.workflow.searchFirst')}
      </Badge>
    );
  }

  if (workflow === WorkflowKind.DIRECT_LLM) {
    return (
      <Badge
        variant="outline"
        title={t('chat.workflow.tooltipDirect')}
        className="gap-1 text-xs text-muted-foreground"
      >
        <MessageSquare className="h-3 w-3" />
        {t('chat.workflow.direct')}
      </Badge>
    );
  }

  // Workflow value is something the routing-service emitted but the FE
  // has no live executor for yet. Render the honest "not available" badge
  // so users see the truth instead of a silent fallthrough.
  return (
    <Badge
      variant="outline"
      className="gap-1 border-warning/50 text-xs text-warning"
    >
      {t('chat.workflow.unavailable', { workflow: String(workflow) })}
    </Badge>
  );
}
