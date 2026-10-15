import { Loader2, Sparkles } from 'lucide-react';
import type { ReactElement } from 'react';

import { ThreadFormatPreviewView } from '@/components/threads/format/thread-format-preview-view';
import { Button } from '@/components/ui/button';
import { ThreadFormatView } from '@/constants/thread-format.constants';
import { useThreadFormatPanel } from '@/hooks/threads/use-thread-format-panel';
import { useTranslation } from '@/lib/i18n';
import type { ThreadFormatPanelProps } from '@/types/thread-format.types';

/**
 * The owner's "Improve formatting with AI" action on the review screen. It only previews: the
 * improved text is saved (as a new version that is reviewed again) when the owner chooses it.
 */
export function ThreadFormatPanel({ detail }: ThreadFormatPanelProps): ReactElement | null {
  const { t } = useTranslation();
  const panel = useThreadFormatPanel(detail);
  const { preview } = panel;
  if (!detail.generation.data?.draft || detail.editingRevision) {
    return null;
  }

  return (
    <section
      className="border-border flex flex-col gap-3 rounded-lg border p-4"
      aria-labelledby="thread-format-title"
      data-testid="thread-format-panel"
    >
      <h3 id="thread-format-title" className="flex items-center gap-2 font-medium">
        <Sparkles className="size-4" aria-hidden="true" />
        {t('threadArticle.formatTitle')}
      </h3>
      {panel.accepted ? (
        <p role="status" className="text-sm">
          {t('threadArticle.formatAccepted')}
        </p>
      ) : null}
      {panel.errorText ? (
        <p role="alert" className="text-destructive text-sm">
          {panel.errorText}
        </p>
      ) : null}
      {preview === null ? (
        <>
          <p className="text-muted-foreground text-sm">{t('threadArticle.formatIntro')}</p>
          <p className="text-muted-foreground text-xs">{t('threadArticle.formatCost')}</p>
          <div>
            <Button type="button" variant="outline" disabled={!panel.canRun} onClick={panel.run}>
              {panel.isRunning ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="size-4" aria-hidden="true" />
              )}
              {panel.isRunning ? t('threadArticle.formatRunning') : t('threadArticle.formatRun')}
            </Button>
          </div>
        </>
      ) : (
        <>
          {panel.skippedText ? (
            <p role="status" className="text-sm">
              {panel.skippedText}
            </p>
          ) : (
            <div role="group" aria-label={t('threadArticle.formatTitle')} className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={panel.view === ThreadFormatView.Before ? 'default' : 'outline'}
                aria-pressed={panel.view === ThreadFormatView.Before}
                onClick={() => {
                  panel.setView(ThreadFormatView.Before);
                }}
              >
                {t('threadArticle.formatBefore')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={panel.view === ThreadFormatView.After ? 'default' : 'outline'}
                aria-pressed={panel.view === ThreadFormatView.After}
                onClick={() => {
                  panel.setView(ThreadFormatView.After);
                }}
              >
                {t('threadArticle.formatAfter')}
              </Button>
            </div>
          )}
          {panel.skippedText ? null : (
            <ThreadFormatPreviewView
              key={panel.view}
              markdown={
                panel.view === ThreadFormatView.Before ? preview.originalMarkdown : preview.markdown
              }
              contentLocale={panel.contentLocale}
            />
          )}
          <p className="text-muted-foreground text-xs">
            {t('threadArticle.formatRemaining', { count: preview.remainingToday })}
          </p>
          <div className="flex flex-wrap gap-2">
            {panel.skippedText ? null : (
              <Button type="button" disabled={panel.isAccepting} onClick={panel.accept}>
                {panel.isAccepting
                  ? t('threadArticle.formatAccepting')
                  : t('threadArticle.formatAccept')}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={panel.isAccepting}
              onClick={panel.discard}
            >
              {t('threadArticle.formatDiscard')}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
