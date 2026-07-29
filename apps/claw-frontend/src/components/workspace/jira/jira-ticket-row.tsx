import { Tag } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { JIRA_PRIORITY_COLORS } from '@/constants/jira.constants';
import type { JiraTicketRowProps } from '@/types/component.types';

export function JiraTicketRow({
  ticket,
  metadata,
  onClick,
  t,
}: JiraTicketRowProps): React.ReactElement {
  const priorityClass =
    JIRA_PRIORITY_COLORS[metadata.priority] ?? 'bg-muted text-muted-foreground border-border';

  return (
    <Button
      variant="unstyled"
      size="unstyled"
      type="button"
      onClick={onClick}
      className="border-border hover:bg-accent flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors"
    >
      <Tag className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{ticket.title}</span>
          <span className="text-muted-foreground shrink-0 text-xs">
            {metadata.projectKey !== '' ? metadata.projectKey : metadata.project}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-xs">
            {metadata.issueType}
          </Badge>
          <Badge variant="outline" className={`text-xs ${priorityClass}`}>
            {t('jira.ticket.priority')}: {metadata.priority}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {metadata.status}
          </Badge>
          {metadata.assignee !== null && (
            <span className="text-muted-foreground text-xs">
              {t('jira.ticket.assignee')}: {metadata.assignee}
            </span>
          )}
        </div>
      </div>
    </Button>
  );
}
