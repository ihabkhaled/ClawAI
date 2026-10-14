import { useContext } from 'react';

import type { ThreadBoardMode } from '@/enums/thread-board-mode.enum';
import { BoardModeContext } from '@/lib/threads/board-mode-context';

export function useBoardMode(): ThreadBoardMode {
  return useContext(BoardModeContext);
}
