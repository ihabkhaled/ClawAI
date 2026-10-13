import { ChevronLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { COMPOSER_PLUS_ITEM_ATTRIBUTE } from '@/constants/composer-plus-menu.constants';
import { useTranslation } from '@/lib/i18n';
import type { ComposerPlusSubPanelProps } from '@/types/composer-plus-menu.types';

/** A sub-panel of the "+" menu with a Back row on top, so the menu stays one surface. */
export function ComposerPlusSubPanel({
  title,
  onBack,
  children,
}: ComposerPlusSubPanelProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1 p-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onBack}
        aria-label={`${t('chat.composerMenu.back')}: ${title}`}
        className="touch:min-h-11 h-9 justify-start gap-2 px-2 text-start"
        {...{ [COMPOSER_PLUS_ITEM_ATTRIBUTE]: '' }}
      >
        <ChevronLeft className="size-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
        <span className="text-sm font-semibold">{title}</span>
      </Button>
      {children}
    </div>
  );
}
