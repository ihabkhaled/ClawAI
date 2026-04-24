import { ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { JiraTicketDialogProps } from '@/types/component.types';
import { extractJiraMetadata } from '@/utilities/jira.utility';

import { JiraActionsBar } from './jira-actions-bar';

export function JiraTicketDialog({
  ticket,
  open,
  onClose,
  onOpenAiAction,
  t,
}: JiraTicketDialogProps): React.ReactElement {
  const metadata = ticket !== null ? extractJiraMetadata(ticket.metadata) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        {ticket !== null && metadata !== null ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 text-base">{ticket.title}</DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-wrap gap-2 pt-1 text-sm">
                  <Badge variant="outline">{metadata.issueType}</Badge>
                  <Badge variant="secondary">{metadata.status}</Badge>
                  <span className="text-muted-foreground">
                    {t('jira.ticket.priority')}: {metadata.priority}
                  </span>
                  {metadata.project !== '' && (
                    <span className="text-muted-foreground">
                      {t('jira.ticket.project')}: {metadata.project}
                    </span>
                  )}
                  {metadata.assignee !== null ? (
                    <span className="text-muted-foreground">
                      {t('jira.ticket.assignee')}: {metadata.assignee}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t('jira.ticket.unassigned')}</span>
                  )}
                  {metadata.sprint !== null && (
                    <span className="text-muted-foreground">
                      {t('jira.ticket.sprint')}: {metadata.sprint}
                    </span>
                  )}
                  {metadata.storyPoints !== null && (
                    <span className="text-muted-foreground">
                      {t('jira.ticket.story_points')}: {metadata.storyPoints}
                    </span>
                  )}
                  {metadata.dueDate !== null && (
                    <span className="text-muted-foreground">
                      {t('jira.ticket.due_date')}: {new Date(metadata.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {metadata.labels.length > 0 && (
                    <span className="text-muted-foreground">
                      {t('jira.ticket.labels')}: {metadata.labels.join(', ')}
                    </span>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>

            {ticket.content !== null && ticket.content.length > 0 ? (
              <div className="rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed">
                {ticket.content}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <JiraActionsBar
                ticket={ticket}
                onAction={onOpenAiAction}
                isDraftPending={false}
                t={t}
              />
              {ticket.url !== null && (
                <Button type="button" variant="ghost" size="sm" asChild>
                  <a href={ticket.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 size-3.5" aria-hidden="true" />
                    {t('jira.ticket.open_in_jira')}
                  </a>
                </Button>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
