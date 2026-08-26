'use client';

import { Bug } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useThreadContextInspector } from '@/hooks/chat/use-thread-context-inspector';
import { useTranslation } from '@/lib/i18n';
import { MarkdownRenderer } from '@/lib/markdown';
import type { ThreadContextInspectorProps } from '@/types';
import { toMarkdownJsonBlock } from '@/utilities';

export function ThreadContextInspectorBody({
  messageId,
}: ThreadContextInspectorProps): React.ReactElement {
  const { t } = useTranslation();
  const { isOpen, openInspector, setOpen, receipt, isLoading, isError } =
    useThreadContextInspector(messageId);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={openInspector}
        className="touch:text-xs text-muted-foreground hover:text-foreground h-6 gap-1 px-1.5 text-[10px]"
        aria-label={t('threadContextInspector.openLabel')}
      >
        <Bug className="h-3 w-3" />
        {t('threadContextInspector.debugBadge')}
      </Button>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('threadContextInspector.title')}</DialogTitle>
            <DialogDescription>{t('threadContextInspector.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {isLoading ? (
              <p className="text-muted-foreground">{t('threadContextInspector.loading')}</p>
            ) : null}
            {isError ? (
              <p className="text-destructive">{t('threadContextInspector.loadFailed')}</p>
            ) : null}
            {!isLoading && !isError && receipt === null ? (
              <p className="text-muted-foreground">{t('threadContextInspector.noReceipt')}</p>
            ) : null}
            {!isLoading && !isError && receipt !== null ? (
              <div className="space-y-2">
                <ul className="grid grid-cols-2 gap-2 text-xs">
                  <li>
                    {t('threadContextInspector.fieldMemories')}: {String(receipt.memories.length)}
                  </li>
                  <li>
                    {t('threadContextInspector.fieldPackItems')}: {String(receipt.packItems.length)}
                  </li>
                  <li>
                    {t('threadContextInspector.fieldTokensUsed')}: {String(receipt.tokenBudgetUsed)}{' '}
                    / {String(receipt.tokenBudget)}
                  </li>
                  <li>
                    {t('threadContextInspector.fieldAssemblyOrder')}:{' '}
                    {receipt.assemblyOrder.join(' → ')}
                  </li>
                </ul>
                <MarkdownRenderer content={toMarkdownJsonBlock(receipt)} />
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
