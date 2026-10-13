import {
  CONTEXT_SAVE_MODE_AUTO,
  CONTEXT_SAVE_MODE_CHANGE_EVENT,
  CONTEXT_SAVE_MODE_STORAGE_KEY,
  DEFAULT_CONTEXT_SAVE_MODE,
} from '@/constants/context-save.constants';
import { useAuthStore } from '@/stores/auth.store';
import type { ContextSaveMode } from '@/types';

/**
 * What this tab remembers when localStorage is unavailable (private window,
 * blocked site data), per account. The choice then lasts until the page is
 * closed instead of silently reverting to ASK on the very next message.
 */
const memoryModes = new Map<string, ContextSaveMode>();

function isContextSaveMode(value: unknown): value is ContextSaveMode {
  return value === 'ASK' || value === 'AUTO';
}

/** The signed-in account's id, or null when nobody is signed in. */
function currentUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null;
}

/**
 * One key per account. "Always save automatically" is a consent given by one
 * person, so it must never apply to whoever signs in next on the same browser.
 */
export function contextSaveModeStorageKey(userId: string): string {
  return `${CONTEXT_SAVE_MODE_STORAGE_KEY}:${userId}`;
}

/**
 * The viewer's save mode: ASK (propose first, the default) or AUTO (save at once).
 * Never throws; anything unreadable or unrecognised, and any signed-out state, is
 * the default, ASK.
 */
export function readContextSaveMode(): ContextSaveMode {
  const userId = currentUserId();
  if (typeof window === 'undefined' || userId === null) {
    return DEFAULT_CONTEXT_SAVE_MODE;
  }
  try {
    const stored = window.localStorage.getItem(contextSaveModeStorageKey(userId));
    return isContextSaveMode(stored) ? stored : DEFAULT_CONTEXT_SAVE_MODE;
  } catch {
    // Storage is blocked: fall through to what this tab remembers.
  }
  return memoryModes.get(userId) ?? DEFAULT_CONTEXT_SAVE_MODE;
}

/**
 * Persists the mode for the signed-in account and tells every subscriber in this
 * tab. A write that storage refuses is still honoured for the rest of the session.
 */
export function writeContextSaveMode(mode: ContextSaveMode): void {
  const userId = currentUserId();
  if (typeof window === 'undefined' || userId === null) {
    return;
  }
  if (mode === CONTEXT_SAVE_MODE_AUTO) {
    memoryModes.set(userId, mode);
  } else {
    memoryModes.delete(userId);
  }
  try {
    if (mode === DEFAULT_CONTEXT_SAVE_MODE) {
      window.localStorage.removeItem(contextSaveModeStorageKey(userId));
    } else {
      window.localStorage.setItem(contextSaveModeStorageKey(userId), mode);
    }
  } catch {
    // Kept in memory above.
  }
  window.dispatchEvent(new Event(CONTEXT_SAVE_MODE_CHANGE_EVENT));
}

/**
 * Lets a subscriber hear this tab's changes, other tabs' storage writes and a
 * change of signed-in account (sign-out, sign-in as someone else).
 */
export function subscribeContextSaveMode(onChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  const onStorage = (event: StorageEvent): void => {
    if (
      event.key === null ||
      event.key === CONTEXT_SAVE_MODE_STORAGE_KEY ||
      event.key.startsWith(`${CONTEXT_SAVE_MODE_STORAGE_KEY}:`)
    ) {
      onChange();
    }
  };
  window.addEventListener(CONTEXT_SAVE_MODE_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  let previousUserId = currentUserId();
  const unsubscribeAuth = useAuthStore.subscribe((state) => {
    const nextUserId = state.user?.id ?? null;
    if (nextUserId !== previousUserId) {
      previousUserId = nextUserId;
      onChange();
    }
  });
  return () => {
    window.removeEventListener(CONTEXT_SAVE_MODE_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
    unsubscribeAuth();
  };
}

/** Test seam: forgets the in-memory fallback. */
export function resetContextSaveModeMemory(): void {
  memoryModes.clear();
}
