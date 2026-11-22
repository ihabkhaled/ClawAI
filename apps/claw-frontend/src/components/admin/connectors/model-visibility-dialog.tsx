'use client';

import type { ReactElement } from 'react';

import { ModelVisibilityGateList } from '@/components/admin/connectors/model-visibility-gate-list';
import { ModelVisibilityHistory } from '@/components/admin/connectors/model-visibility-history';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MODEL_VISIBILITY_GATE_LABEL_KEYS } from '@/constants/model-visibility.constants';
import { useModelVisibility } from '@/hooks/admin/use-model-visibility';
import type { ModelVisibilityDialogProps } from '@/types/model-visibility.types';

/** The answer to "why is this model not in the chat picker?", gate by gate. */
export function ModelVisibilityDialog({
  provider,
  modelKey,
  onClose,
  t,
}: ModelVisibilityDialogProps): ReactElement {
  const { report, isLoading, isError, locale, onOpenChange } = useModelVisibility(
    provider,
    modelKey,
    onClose,
  );
  const failingGate = report?.firstFailingGate ?? null;
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="break-words">
            {t('adminConnectors.visibility.panelTitle', { model: modelKey })}
          </DialogTitle>
          <DialogDescription>{t('adminConnectors.visibility.panelDescription')}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-muted-foreground text-sm" role="status">
            {t('adminConnectors.visibility.loading')}
          </p>
        ) : null}
        {isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t('adminConnectors.visibility.loadError')}
          </p>
        ) : null}
        {report === null ? null : (
          <div className="flex min-w-0 flex-col gap-4" data-testid="model-visibility-report">
            <p className="text-sm font-medium" role="status">
              {report.visibleInPicker
                ? t('adminConnectors.visibility.visibleSummary')
                : t('adminConnectors.visibility.hiddenSummary', {
                    gate:
                      failingGate === null
                        ? t('adminConnectors.visibility.statusUnknown')
                        : t(MODEL_VISIBILITY_GATE_LABEL_KEYS[failingGate]),
                  })}
            </p>
            <ModelVisibilityGateList gates={report.gates} t={t} />
            <p className="text-muted-foreground text-xs">
              {t('adminConnectors.visibility.planNote')}
            </p>
            <ModelVisibilityHistory events={report.recentEvents} locale={locale} t={t} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
