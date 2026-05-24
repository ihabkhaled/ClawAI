'use client';

import { Eye } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { usePreviewContext } from '@/hooks/chat/use-preview-context';
import { useTranslation } from '@/lib/i18n';
import type { PreviewContextButtonProps } from '@/types/context-receipt-component.types';

export function PreviewContextButton(props: PreviewContextButtonProps): React.ReactElement {
  const { threadId, draft } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const preview = usePreviewContext(threadId);

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (nextOpen) {
      preview.mutate({ draft });
    }
  };

  const bundle = preview.data;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1" aria-label={t('preview.openLabel')}>
          <Eye className="h-3 w-3" />
          {t('preview.openLabel')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('preview.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('preview.dialogDescription')}</DialogDescription>
        </DialogHeader>
        {preview.isPending && (
          <p className="text-sm text-muted-foreground">{t('preview.loading')}</p>
        )}
        {preview.isError && <p className="text-sm text-destructive">{t('preview.failed')}</p>}
        {bundle && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
                {bundle.warnings.join('; ')}
              </p>
            )}
            {bundle.memories.length === 0 && bundle.packItems.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('preview.empty')}</p>
            )}
            {bundle.memories.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
