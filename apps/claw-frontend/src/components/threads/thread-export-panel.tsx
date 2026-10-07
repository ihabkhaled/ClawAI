'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { useThreadExportPanel } from '@/hooks/threads/use-thread-export-panel';
import { useTranslation } from '@/lib/i18n';
import type { ThreadExportPanelProps } from '@/types/thread-export.types';

/**
 * Pick one or several formats and download them together, or save the page as a PDF.
 * One format is saved as itself; several arrive as one ZIP. PDF uses the browser's own print
 * dialog, which handles every script and right-to-left text correctly.
 */
export function ThreadExportPanel({
  baseName,
  options,
  buildFile,
  showPdf,
}: ThreadExportPanelProps): ReactElement {
  const { t } = useTranslation();
  const panel = useThreadExportPanel({ baseName, buildFile });
  const count = panel.selected.size;

  return (
    <fieldset
      data-no-print
      data-testid="thread-export-panel"
      className="border-border flex flex-col gap-3 rounded-lg border p-4"
    >
      <legend className="px-1 text-sm font-medium">{t('chat.threadExportPanelTitle')}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((option) => (
          <label key={option.format} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={panel.selected.has(option.format)}
              onChange={() => panel.toggle(option.format)}
            />
            {t(option.labelKey)}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void panel.download();
          }}
          disabled={!panel.canDownload}
          isLoading={panel.isBusy}
        >
          {count > 1
            ? t('chat.threadExportDownloadZip', { count: String(count) })
            : t('chat.threadExportDownloadOne')}
        </Button>
        {showPdf ? (
          <Button type="button" variant="outline" onClick={panel.savePdf}>
            {t('chat.threadExportPdf')}
          </Button>
        ) : null}
      </div>
      {count === 0 ? (
        <p className="text-muted-foreground text-xs">{t('chat.threadExportSelectOne')}</p>
      ) : null}
      {showPdf ? (
        <p className="text-muted-foreground text-xs">{t('chat.threadExportPdfHint')}</p>
      ) : null}
      {panel.hasFailed ? <p role="alert">{t('chat.threadExportFailed')}</p> : null}
    </fieldset>
  );
}
