import { createContext } from 'react';

import { ThreadBoardMode } from '@/enums/thread-board-mode.enum';

/** The signed-in Board is the default, so the portal needs no provider. */
export const BoardModeContext = createContext<ThreadBoardMode>(ThreadBoardMode.Member);
