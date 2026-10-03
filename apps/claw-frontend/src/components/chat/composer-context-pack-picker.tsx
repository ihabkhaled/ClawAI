'use client';

import Link from 'next/link';

import { Checkbox } from '@/components/ui/checkbox';
import { COMPOSER_CONTEXT_PACKS_MAX } from '@/constants/composer-context.constants';
import { ROUTES } from '@/constants/routes.constants';
import { useTranslation } from '@/lib/i18n';
import type { ComposerContextPackListProps } from '@/types/composer-context.types';

/**
 * The pack picker section of the Context menu: every pack with a checkbox.
 * A pick is the real attachment, saved on the thread as it is made.
 */
export function ComposerContextPackPicker({
  picker,
}: ComposerContextPackListProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col gap-2">
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
      <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
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
    </section>
  );
}
