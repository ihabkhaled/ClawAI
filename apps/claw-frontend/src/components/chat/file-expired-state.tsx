import { FileClock, Loader2, RefreshCw, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { FileExpiredStateProps } from '@/types';

/**
 * A generated file whose hour is up. Its text is kept, so it can be rebuilt
 * for free (identical) or asked of the AI again (new version, costs tokens).
 */
export function FileExpiredState({
  filename,
  format,
  isRebuilding,
  onRebuild,
  onRegenerate,
}: FileExpiredStateProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="border-border rounded-xl border border-dashed p-4" data-testid="file-expired">
      <div className="flex items-center gap-3">
        <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <FileClock className="text-muted-foreground h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{filename}</div>
          <div className="text-muted-foreground text-xs">
            {format.toUpperCase()}
            {' \u00b7 '}
            {t('chat.fileExpired')}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          disabled={isRebuilding}
          onClick={onRebuild}
          data-testid="file-rebuild"
        >
          {isRebuilding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {t('chat.fileRebuild')}
        </Button>
        {onRegenerate ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={onRegenerate}
            data-testid="file-regenerate-ai"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {t('chat.fileRegenerateAi')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
