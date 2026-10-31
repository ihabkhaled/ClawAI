import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { ThreadListNavigateMode } from '@/enums/thread-list-navigate-mode.enum';
import type { ThreadListNavigate, ThreadListUrlState } from '@/types/thread-list.types';
import {
  buildThreadListSearch,
  parseThreadListUrlState,
} from '@/utilities/thread-list-url-state.utility';

/** `?q=&status=&page=` as state. Paging and filters add history entries; typing replaces. */
export function useThreadListUrlState(): {
  state: ThreadListUrlState;
  navigate: ThreadListNavigate;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const state = useMemo(() => parseThreadListUrlState(searchParams), [searchParams]);
  const navigate = useCallback<ThreadListNavigate>(
    (next, mode) => {
      const url = `${pathname}${buildThreadListSearch(next)}`;
      if (mode === ThreadListNavigateMode.REPLACE) {
        router.replace(url, { scroll: false });
      } else {
        router.push(url, { scroll: false });
      }
    },
    [pathname, router],
  );
  return { state, navigate };
}
