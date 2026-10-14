'use client';

import type { ReactElement } from 'react';

import { BoardPageView } from '@/components/threads/board/board-page-view';
import { ThreadBoardMode } from '@/enums/thread-board-mode.enum';
import { BoardModeContext } from '@/lib/threads/board-mode-context';
import type { GuestBoardPageViewProps } from '@/types/thread-board-view.types';

/** The public, read-only Board for visitors without an account: the member Board in guest mode. */
export function GuestBoardPageView({ initial }: GuestBoardPageViewProps): ReactElement {
  return (
    <BoardModeContext.Provider value={ThreadBoardMode.Guest}>
      <BoardPageView initial={initial} />
    </BoardModeContext.Provider>
  );
}
