import {
  THREAD_BOARD_PUBLIC_API_PATH,
  THREAD_BOARD_PUBLIC_REVALIDATE_SECONDS,
} from '@/constants/thread-board-guest.constants';
import { THREAD_BOARD_DEFAULT_PAGE_SIZE } from '@/constants/thread-board.constants';
import { THREAD_PUBLIC_FETCH_TIMEOUT_MS } from '@/constants/thread-public-api.constants';
import { getThreadsServiceOrigin } from '@/lib/threads/public-thread-api';
import type { ThreadBoardListResponse, ThreadBoardState } from '@/types/thread-board.types';
import { toPublicBoardList } from '@/utilities/thread-board-public.utility';
import { buildBoardListQuery } from '@/utilities/thread-board-query.utility';

/**
 * The first page of the guest Board for the server-rendered marketing page: a direct call to
 * threads-service, cached for a minute (the page is the same for every visitor). A failure is
 * `null`, not an empty list, so the client then loads the page itself and shows its own error
 * state instead of claiming there are no Threads.
 */
export async function getPublicBoardPage(
  state: ThreadBoardState,
): Promise<ThreadBoardListResponse | null> {
  const origin = getThreadsServiceOrigin();
  if (origin === null) {
    return null;
  }
  const query = new URLSearchParams(
    buildBoardListQuery({ ...state, limit: THREAD_BOARD_DEFAULT_PAGE_SIZE }),
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), THREAD_PUBLIC_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${origin}/api/v1${THREAD_BOARD_PUBLIC_API_PATH}?${query}`, {
      next: { revalidate: THREAD_BOARD_PUBLIC_REVALIDATE_SECONDS },
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    return response.ok ? toPublicBoardList(await response.json()) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
