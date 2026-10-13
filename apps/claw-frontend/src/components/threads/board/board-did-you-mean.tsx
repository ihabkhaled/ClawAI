import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { BoardDidYouMeanProps } from '@/types/thread-board-search.types';

/** Spelling correction row; sits above the listbox so the option indexes stay contiguous. */
export function BoardDidYouMean({ term, onSelect }: BoardDidYouMeanProps): ReactElement {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onSelect}
      className="min-h-11 w-full justify-start rounded-none border-b px-3 py-2 text-start"
    >
      {t('chat.threadBoardDidYouMean', { term })}
    </Button>
  );
}
