import { TicketCheck } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import type { JiraTicketListProps } from '@/types/component.types';
import { extractJiraMetadata } from '@/utilities/jira.utility';

import { JiraTicketRow } from './jira-ticket-row';

export function JiraTicketList({
  tickets,
  isLoading,
  isError,
  onSelectTicket,
  t,
}: JiraTicketListProps): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label={t('jira.page.title')} />;
  }

  if (isError) {
    return <p className="text-sm text-destructive">{t('jira.page.error_title')}</p>;
  }

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={TicketCheck}
        title={t('jira.page.empty_title')}
        description={t('jira.page.empty_description')}
      />
    );
  }

  return (
    <div className="space-y-1">
      {tickets.map((ticket) => {
        const meta = extractJiraMetadata(ticket.metadata);
        return (
          <JiraTicketRow
            key={ticket.id}
            ticket={ticket}
            metadata={meta}
            onClick={() => onSelectTicket(ticket)}
            t={t}
          />
        );
      })}
    </div>
  );
}
