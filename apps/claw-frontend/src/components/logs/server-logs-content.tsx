import { Server } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import type { ServerLogsContentProps } from '@/types';

import { ServerLogEntryRow } from './server-log-entry-row';

export function ServerLogsContent({
  logs,
  meta,
  page,
  setPage,
  isLoading,
  isError,
}: ServerLogsContentProps): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label="Loading server logs..." />;
  }

  if (isError) {
    return (
      <EmptyState
        icon={Server}
        title="Failed to load server logs"
        description="Could not fetch server logs. Please try again later."
      />
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={Server}
        title="No server logs"
        description="Server-side activity logs will appear here as services process requests."
      />
    );
  }

  return (
    <>
      <div className="rounded-md border">
        {logs.map((entry) => (
          <ServerLogEntryRow key={entry._id} entry={entry} />
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
