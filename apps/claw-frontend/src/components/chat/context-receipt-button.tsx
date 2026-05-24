'use client';

import { Info } from 'lucide-react';
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
import { useContextReceipt } from '@/hooks/chat/use-context-receipt';
import { useTranslation } from '@/lib/i18n';
import type { ContextReceiptButtonProps } from '@/types/context-receipt-component.types';

export function ContextReceiptButton(props: ContextReceiptButtonProps): React.ReactElement {
  const { messageId } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { receipt, isLoading, isError } = useContextReceipt(messageId, open);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          aria-label={t('receipt.openLabel')}
        >
          <Info className="h-3 w-3" />
          {t('receipt.contextUsed')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('receipt.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('receipt.dialogDescription')}</DialogDescription>
        </DialogHeader>
        {isLoading && <p className="text-sm text-muted-foreground">{t('receipt.loading')}</p>}
        {isError && <p className="text-sm text-destructive">{t('receipt.notAvailable')}</p>}
        {receipt && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {t('receipt.memoriesCount', { value: String(receipt.memories.length) })}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {t('receipt.packItemsCount', { value: String(receipt.packItems.length) })}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {t('receipt.tokenBudget', {
                  used: String(receipt.tokenBudgetUsed),
                  total: String(receipt.tokenBudget),
                })}
              </Badge>
            </div>

            {receipt.memories.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('receipt.memoriesHeading')}
                </h3>
                <ul className="space-y-2">
                  {receipt.memories.map((m) => (
                    <li key={m.id} className="rounded-md border p-2">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {m.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {m.reason}
                        </Badge>
                        {m.sensitivity !== 'NORMAL' && (
                          <Badge variant="destructive" className="text-xs">
                            {m.sensitivity}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {t('receipt.scoreLabel', { value: m.score.toFixed(2) })}
                        </span>
                      </div>
                      <p className="text-xs">{m.content ?? t('receipt.redactedPlaceholder')}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {receipt.packItems.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('receipt.packItemsHeading')}
                </h3>
                <ul className="space-y-2">
                  {receipt.packItems.map((p) => (
                    <li key={p.id} className="rounded-md border p-2">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {p.itemType}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {p.reason}
                        </Badge>
                        {p.pinned && (
                          <Badge variant="default" className="text-xs">
                            {t('receipt.pinnedBadge')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs">{p.content}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {receipt.warnings.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('receipt.warningsHeading')}
                </h3>
                <ul className="space-y-1 text-xs text-amber-600 dark:text-amber-400">
                  {receipt.warnings.map((w) => (
                    <li key={w}>• {w}</li>
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
