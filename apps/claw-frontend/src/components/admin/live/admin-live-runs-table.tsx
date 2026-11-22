import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AdminLiveSectionProps } from '@/types/live-admin.types';
import { formatLiveDate } from '@/utilities/live-request.utility';

/** Active runs with a per-row emergency stop (confirmed first). */
export function AdminLiveRunsTable({ controller }: AdminLiveSectionProps): React.ReactElement {
  const { t, locale } = controller;
  const runs = controller.overview?.activeRuns ?? [];
  if (runs.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('live.admin.runsEmpty')}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <Table data-testid="admin-live-runs">
        <TableHeader>
          <TableRow>
            <TableHead>{t('live.admin.runSource')}</TableHead>
            <TableHead>{t('live.admin.runStatus')}</TableHead>
            <TableHead>{t('live.admin.runViewers')}</TableHead>
            <TableHead>{t('live.admin.runStarted')}</TableHead>
            <TableHead>
              <span className="sr-only">{t('live.admin.stop')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.runId}>
              <TableCell dir="auto">{run.title ?? run.sourceKind}</TableCell>
              <TableCell>{run.status}</TableCell>
              <TableCell>{run.viewers}</TableCell>
              <TableCell>{formatLiveDate(run.startedAt, locale)}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="destructive"
                  isLoading={controller.pendingRunId === run.runId}
                  onClick={() => controller.askStopRun(run.runId)}
                >
                  {t('live.admin.stop')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
