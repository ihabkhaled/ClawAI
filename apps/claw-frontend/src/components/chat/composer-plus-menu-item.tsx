import { ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  COMPOSER_PLUS_ITEM_ATTRIBUTE,
  COMPOSER_PLUS_RETURN_ATTRIBUTE,
} from '@/constants/composer-plus-menu.constants';
import type { ComposerPlusMenuItemProps } from '@/types/composer-plus-menu.types';

/**
 * One row of the "+" menu: a tinted icon tile, a label and a one-line hint, the way
 * a chat app's attach menu reads. Rows that open a sub-panel end in a chevron that flips in RTL.
 */
export function ComposerPlusMenuItem({
  icon: Icon,
  label,
  hint,
  trailing,
  opensPanel = false,
  returnKey,
  disabled = false,
  onClick,
  dataTour,
}: ComposerPlusMenuItemProps): React.ReactElement {
  const itemAttributes = {
    [COMPOSER_PLUS_ITEM_ATTRIBUTE]: '',
    ...(returnKey === undefined ? {} : { [COMPOSER_PLUS_RETURN_ATTRIBUTE]: returnKey }),
  };

  return (
    <Button
      type="button"
      variant="ghost"
      disabled={disabled}
      onClick={onClick}
      data-tour={dataTour}
      className="touch:min-h-11 h-auto w-full justify-start gap-3 px-2 py-1.5 text-start font-normal whitespace-normal"
      {...itemAttributes}
    >
      <span className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm leading-tight font-medium">{label}</span>
        {hint === undefined ? null : (
          <span className="text-muted-foreground text-xs leading-snug">{hint}</span>
        )}
      </span>
      {trailing === undefined ? null : (
        <span className="text-muted-foreground shrink-0 text-xs">{trailing}</span>
      )}
      {opensPanel ? (
        <ChevronRight
          className="text-muted-foreground size-4 shrink-0 rtl:rotate-180"
          aria-hidden="true"
        />
      ) : null}
    </Button>
  );
}
