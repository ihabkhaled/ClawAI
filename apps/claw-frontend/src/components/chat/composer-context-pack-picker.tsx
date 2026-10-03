'use client';

import { Layers } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COMPOSER_CONTEXT_PACKS_MAX } from '@/constants/composer-context.constants';
import { ROUTES } from '@/constants/routes.constants';
import { useComposerContextPacks } from '@/hooks/chat/use-composer-context-packs';
import { useTranslation } from '@/lib/i18n';
import type { ComposerContextControlProps } from '@/types/composer-context.types';

/**
 * Picks the context packs this chat carries, from the composer toolbar.
 *
 * Icon-only with a count, because the toolbar row scrolls sideways rather than
 * wrapping (rules/40 §11): a labelled button would cost a model name's worth of
 * width. The accessible name says what it is and the badge says how many are on.
 * A pick is the real attachment, saved on the thread as it is made.
 */
export function ComposerContextPackPicker({
  threadId,
  disabled,
}: ComposerContextControlProps): React.ReactElement {
  const { t } = useTranslation();
  const picker = useComposerContextPacks(threadId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          aria-label={t('chat.composerContext.pickLabel')}
          title={t('chat.composerContext.pickLabel')}
          className="touch:h-11 touch:w-11 relative h-9 w-9 shrink-0"
        >
          <Layers className="h-4 w-4" aria-hidden="true" />
          {picker.selectedCount > 0 ? (
            <Badge
              className="absolute -end-1 -top-1 h-4 min-w-4 justify-center px-1 text-[10px]"
              aria-hidden="true"
            >
              {picker.selectedCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-80 flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t('chat.composerContext.pickLabel')}</h3>
          <span className="text-muted-foreground text-xs" aria-live="polite">
            {t('chat.composerContext.pickCount', { value: String(picker.selectedCount) })}
          </span>
        </div>
        {picker.isLoading ? (
          <p className="text-muted-foreground text-xs">{t('common.loading')}</p>
        ) : null}
        {!picker.isLoading && picker.packs.length === 0 ? (
          <p className="text-muted-foreground text-xs">{t('chat.composerContext.pickEmpty')}</p>
        ) : null}
        <ul className="flex flex-col gap-1">
          {picker.packs.map((pack) => {
            const checked = picker.selectedIds.includes(pack.id);
            return (
              <li key={pack.id}>
                <label className="hover:bg-accent touch:min-h-11 flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm">
                  <Checkbox
                    checked={checked}
                    disabled={!checked && picker.atLimit}
                    onCheckedChange={() => picker.toggle(pack.id)}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate-fixed font-medium">{pack.name}</span>
                    {pack.description ? (
                      <span className="text-muted-foreground truncate-fixed text-xs">
                        {pack.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {picker.atLimit ? (
          <p className="text-muted-foreground text-xs">
            {t('chat.composerContext.pickLimit', { value: String(COMPOSER_CONTEXT_PACKS_MAX) })}
          </p>
        ) : null}
        <Link href={ROUTES.CONTEXT} className="text-primary text-xs underline underline-offset-2">
          {t('chat.composerContext.pickManage')}
        </Link>
      </PopoverContent>
    </Popover>
  );
}
