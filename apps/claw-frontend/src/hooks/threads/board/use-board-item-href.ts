import { useCallback } from 'react';

import { useBoardMode } from '@/hooks/threads/board/use-board-mode';
import { useTranslation } from '@/lib/i18n';
import { boardItemHref } from '@/utilities/thread-board-view.utility';

/** The address a Board item opens at, for the current mode (portal reader or public Thread). */
export function useBoardItemHref(): (slug: string) => string {
  const mode = useBoardMode();
  const { locale } = useTranslation();
  return useCallback((slug: string) => boardItemHref(mode, slug, locale), [mode, locale]);
}
