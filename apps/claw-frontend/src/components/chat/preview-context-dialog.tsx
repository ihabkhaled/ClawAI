'use client';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePreviewContextDialog } from '@/hooks/chat/use-preview-context-dialog';
import { useTranslation } from '@/lib/i18n';
import type { PreviewContextDialogProps } from '@/types/composer-plus-menu.types';
import { describeContextWarnings } from '@/utilities/context-warning.utility';

/**
 * The "what would be sent" dry-run, controlled from outside so both the standalone
 * Preview button and the composer "+" menu can open the same dialog.
 */
export function PreviewContextDialog({
  threadId,
  draft,
  open,
  onOpenChange,
}: PreviewContextDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const preview = usePreviewContextDialog(threadId, draft, open);
  const bundle = preview.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('preview.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('preview.dialogDescription')}</DialogDescription>
        </DialogHeader>
        {preview.isPending && (
          <p className="text-muted-foreground text-sm">{t('preview.loading')}</p>
        )}
        {preview.isError && <p className="text-destructive text-sm">{t('preview.failed')}</p>}
        {bundle && (
          <div className="space-y-3 text-sm">
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">
                {t('preview.memoryCount', { value: String(bundle.memories.length) })}
              </Badge>
              <Badge variant="outline">
                {t('preview.packCount', { value: String(bundle.packItems.length) })}
              </Badge>
              <Badge variant="outline">
                {t('preview.tokenBudget', {
                  used: String(bundle.tokenBudgetUsed),
                  total: String(bundle.tokenBudget),
                })}
              </Badge>
            </div>
            {bundle.warnings.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {describeContextWarnings(bundle.warnings, t)}
              </p>
            )}
            {bundle.memories.length === 0 && bundle.packItems.length === 0 && (
              <p className="text-muted-foreground text-sm">{t('preview.empty')}</p>
            )}
            {bundle.memories.length > 0 && (
              <section>
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                  {t('preview.memoriesHeading')}
                </h3>
                <ul className="space-y-2">
                  {bundle.memories.map((m) => (
                    <li key={m.id} className="rounded-md border p-2 text-xs">
                      {m.content ?? t('preview.redactedPlaceholder')}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {bundle.packItems.length > 0 && (
              <section>
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                  {t('preview.packItemsHeading')}
                </h3>
                <ul className="space-y-2">
                  {bundle.packItems.map((p) => (
                    <li key={p.id} className="rounded-md border p-2 text-xs">
                      {p.content}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
