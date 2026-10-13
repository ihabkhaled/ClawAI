'use client';

import { Download, Info, Printer } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { THREAD_EXPORT_FORMAT_ICONS } from '@/constants/thread-export-icons.constants';
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
      data-tour="thread-review-export"
      data-testid="thread-export-panel"
      className="border-border bg-card flex flex-col gap-4 rounded-lg border p-4"
    >
      <legend className="flex items-center gap-2 px-1 text-sm font-medium">
        <Download className="text-muted-foreground h-4 w-4" aria-hidden="true" />
        {t('chat.threadExportPanelTitle')}
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const FormatIcon = THREAD_EXPORT_FORMAT_ICONS[option.format];
          return (
            <label
              key={option.format}
              className="border-border hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors"
            >
              <Checkbox
                checked={panel.selected.has(option.format)}
                onCheckedChange={() => panel.toggle(option.format)}
              />
              <FormatIcon className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">{t(option.labelKey)}</span>
            </label>
          );
        })}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          type="button"
          onClick={() => {
            void panel.download();
          }}
          disabled={!panel.canDownload}
          isLoading={panel.isBusy}
          className="w-full sm:w-auto"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {count > 1
            ? t('chat.threadExportDownloadZip', { count: String(count) })
            : t('chat.threadExportDownloadOne')}
        </Button>
        {showPdf ? (
          <Button
            type="button"
            variant="outline"
            onClick={panel.savePdf}
            className="w-full sm:w-auto"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            {t('chat.threadExportPdf')}
          </Button>
        ) : null}
      </div>
      {count === 0 ? (
        <p className="text-muted-foreground text-xs">{t('chat.threadExportSelectOne')}</p>
      ) : null}
      {showPdf ? (
        <p className="text-muted-foreground flex items-start gap-2 text-xs">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t('chat.threadExportPdfHint')}
        </p>
      ) : null}
      {panel.hasFailed ? <p role="alert">{t('chat.threadExportFailed')}</p> : null}
    </fieldset>
  );
}
