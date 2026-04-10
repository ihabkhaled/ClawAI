import { ScrollText } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import type { ClientLogEntry, ClientLogsTabProps } from '@/types';

import { ClientLogEntryRow } from './client-log-entry-row';

type ClientLogsContentProps = {
  logs: ClientLogEntry[];
  meta: ClientLogsTabProps['meta'];
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  isError: boolean;
};

export function ClientLogsContent({
  logs,
  meta,
  page,
  setPage,
  isLoading,
  isError,
}: ClientLogsContentProps): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label="Loading client logs..." />;
  }

  if (isError) {
    return (
      <EmptyState
        icon={ScrollText}
        title="Failed to load client logs"
        description="Could not fetch client logs. Please try again later."
      />
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="No client logs"
        description="Client-side activity logs will appear here as you interact with the application."
      />
    );
  }

  return (
    <>
      <div className="rounded-md border">
        {logs.map((entry) => (
          <ClientLogEntryRow key={entry._id} entry={entry} />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing page {meta.page} of {meta.totalPages} ({meta.total} total)
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
