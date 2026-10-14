import {
  RELATIVE_TIME_TICK_MS,
  RELATIVE_TIME_TICK_SLACK_MS,
} from '@/constants/relative-time.constants';

import { relativeTimeRefreshMs } from './relative-time.utility';

// One interval for the whole page, however many timestamps are on screen. It runs only while
// something is subscribed, and stays silent while the tab is hidden.
const listeners = new Set<() => void>();
let timerId: ReturnType<typeof setInterval> | null = null;

function isHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden;
}

function notifyAll(): void {
  if (isHidden()) {
    return;
  }
  for (const listener of [...listeners]) {
    listener();
  }
}

function start(): void {
  timerId = setInterval(notifyAll, RELATIVE_TIME_TICK_MS);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', notifyAll);
  }
}

function stop(): void {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', notifyAll);
  }
}

/** Subscribe to the shared tick. Returns the unsubscribe function. */
export function subscribeRelativeTime(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    start();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stop();
    }
  };
}

export function relativeTimeSubscriberCount(): number {
  return listeners.size;
}

/** A subscription that never fires, for values that do not change over time. */
export function subscribeNever(): () => void {
  return () => undefined;
}

/**
 * Wraps a listener so an old timestamp is only re-checked at its own pace (every 30 s while
 * under an hour old, slower after) although the shared tick beats every 30 s.
 */
export function throttleByAge(
  iso: string,
  listener: () => void,
  now: () => number = Date.now,
): () => void {
  let lastRun = now();
  return () => {
    const current = now();
    if (current - lastRun >= relativeTimeRefreshMs(iso, current) - RELATIVE_TIME_TICK_SLACK_MS) {
      lastRun = current;
      listener();
    }
  };
}
