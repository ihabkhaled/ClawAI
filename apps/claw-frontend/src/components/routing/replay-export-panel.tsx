import { Clipboard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useExportReplayRun } from '@/hooks/routing/use-export-replay-run';
import type { ReplayExportPanelProps } from '@/types';

export function ReplayExportPanel({ runId, t }: ReplayExportPanelProps): React.ReactElement {
  const { exportRun, isPending } = useExportReplayRun();

  return (
    <Button variant="outline" size="sm" onClick={() => exportRun(runId)} disabled={isPending}>
      <Clipboard className="me-2 h-4 w-4" />
      {isPending ? t('common.loading') : t('replay.copyBundle')}
    </Button>
  );
}
