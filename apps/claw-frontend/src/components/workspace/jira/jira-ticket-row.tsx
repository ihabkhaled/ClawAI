import { Tag } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
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
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-accent"
    >
      <Tag className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{ticket.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
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
            <span className="text-xs text-muted-foreground">
              {t('jira.ticket.assignee')}: {metadata.assignee}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
