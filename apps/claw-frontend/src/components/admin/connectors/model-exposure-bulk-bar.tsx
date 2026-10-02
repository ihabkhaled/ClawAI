'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import type { ModelExposureBulkBarProps } from '@/types/model-exposure.types';

/**
 * The bulk actions, sticky at the top of the scroller so Expose / Unexpose
 * stay in reach deep into a long list. The row wraps instead of squeezing
 * labels word by word, and the impact warning sits BELOW the buttons, never
 * between them.
 */
export function ModelExposureBulkBar({
  selectedCount,
  impact,
  isSaving,
  onApply,
  onSelectAllVisible,
  onClearSelection,
  t,
}: ModelExposureBulkBarProps): ReactElement {
  const isEmpty = selectedCount === 0;
  return (
    <div
      className="bg-card sticky top-0 z-20 flex flex-col gap-2 border-b py-2"
      data-testid="model-exposure-bulk-bar"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium tabular-nums" aria-live="polite">
          {t('adminConnectors.exposureUi.selectedCount', { count: selectedCount })}
        </span>
        <div className="touch:w-full flex flex-wrap items-center gap-2 sm:ms-auto">
          <Button
            type="button"
            size="sm"
            className="touch:min-h-11 touch:flex-1"
            onClick={() => onApply(true)}
            disabled={isSaving || isEmpty}
          >
            {t('adminConnectors.exposure.exposeSelected')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="touch:min-h-11 touch:flex-1"
            onClick={() => onApply(false)}
            disabled={isSaving || isEmpty}
          >
            {t('adminConnectors.exposure.unexposeSelected')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="touch:hidden"
            onClick={onSelectAllVisible}
          >
            {t('adminConnectors.exposure.selectAllVisible')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="touch:hidden"
            onClick={onClearSelection}
            disabled={isEmpty}
          >
            {t('adminConnectors.exposure.clearSelection')}
          </Button>
        </div>
      </div>
      {/* Shown before the action, not after: an operator cannot undo a
          removal for users who are mid-conversation. */}
      {impact.length > 0 ? (
        <div
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-2 text-xs"
          role="note"
          data-testid="model-exposure-impact"
        >
          <p className="font-medium">{t('adminConnectors.exposure.impactWarning')}</p>
          <ul className="mt-1 grid max-h-32 grid-cols-1 gap-0.5 overflow-y-auto font-mono break-all">
            {impact.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
