import { PROGRESS_EVENT_TYPES } from '@/constants/progress.constants';
import type { RouterStreamEvent, SimpleProgressStreamEvent } from '@/types/chat.types';

// Narrows a wire-parsed RouterStreamEvent down to the "simple" progress
// stage types PROGRESS_EVENT_TYPES covers (the ones useChatStream upserts
// identically via `event.status ?? ACTIVE`). A plain
// `PROGRESS_EVENT_TYPES.has(event.type)` call performs the same runtime
// check but does not narrow a discriminated union for the compiler — a type
// predicate does both.
export function isSimpleProgressStreamEvent(
  event: RouterStreamEvent,
): event is SimpleProgressStreamEvent {
  return PROGRESS_EVENT_TYPES.has(event.type);
}
