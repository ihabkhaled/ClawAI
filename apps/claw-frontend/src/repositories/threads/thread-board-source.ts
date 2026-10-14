import { ThreadBoardMode } from '@/enums/thread-board-mode.enum';
import { threadBoardGuestRepository } from '@/repositories/threads/thread-board-guest.repository';
import { threadBoardRepository } from '@/repositories/threads/thread-board.repository';

/** The Board calls for a mode: signed-in members use the account Board, guests the public one. */
export function getThreadBoardRepository(
  mode: ThreadBoardMode,
): typeof threadBoardRepository | typeof threadBoardGuestRepository {
  return mode === ThreadBoardMode.Guest ? threadBoardGuestRepository : threadBoardRepository;
}
