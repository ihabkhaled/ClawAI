import {
  CLIENT_LOG_FLUSH_INTERVAL_MS,
  CLIENT_LOG_MAX_BATCH_EVENTS,
  CLIENT_LOG_MAX_BUFFER_EVENTS,
  CLIENT_LOG_MIN_TRANSPORT_LEVEL,
  CLIENT_LOG_OCCURRENCES_KEY,
  LOG_SENSITIVE_KEYS,
} from '@/constants';
import { API_BASE_URL } from '@/constants/api.constants';
import { LogLevel } from '@/enums';
import { httpClient } from '@/lib/http-client';
import { useAuthStore } from '@/stores/auth.store';
import { useLogStore } from '@/stores/log.store';
import type { CreateClientLogRequest, LogEntry } from '@/types';
import { passesSeverityGate } from '@/utilities/client-log-severity.utility';

let logBuffer: CreateClientLogRequest[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let beaconRegistered = false;

/**
 * Identity for deduplication.
 *
 * A retrying query or a render loop emits the same line repeatedly; twenty
 * copies carry no more information than one copy and a count. Metadata is
 * deliberately excluded — two events that differ only in a timestamp or a
 * duration are the same event for this purpose.
 */
function dedupeKey(entry: CreateClientLogRequest): string {
  return [entry.level, entry.component ?? '', entry.action ?? '', entry.message].join('\u0000');
}

/**
 * Collapses repeats within one buffer window into a single event carrying an
 * occurrence count.
 */
function collapse(entries: CreateClientLogRequest[]): CreateClientLogRequest[] {
  const bySignature = new Map<string, { entry: CreateClientLogRequest; count: number }>();
  for (const entry of entries) {
    const key = dedupeKey(entry);
    const existing = bySignature.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      bySignature.set(key, { entry, count: 1 });
    }
  }
  return [...bySignature.values()].map(({ entry, count }) =>
    count === 1
      ? entry
      : {
          ...entry,
          metadata: { ...(entry.metadata ?? {}), [CLIENT_LOG_OCCURRENCES_KEY]: count },
        },
  );
}

/**
 * Sends the buffer as batches.
 *
 * `useBeacon` is for the page going away: `sendBeacon` survives unload, where a
 * normal request is cancelled. Anything buffered at navigation used to be
 * dropped silently.
 */
function flushLogs(useBeacon = false): void {
  if (logBuffer.length === 0) {
    return;
  }
  const events = collapse(logBuffer);
  logBuffer = [];

  for (let index = 0; index < events.length; index += CLIENT_LOG_MAX_BATCH_EVENTS) {
    const batch = events.slice(index, index + CLIENT_LOG_MAX_BATCH_EVENTS);
    const payload = { events: batch };

    if (
      useBeacon &&
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function'
    ) {
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(`${API_BASE_URL}/client-logs/batch`, blob);
        continue;
      } catch {
        // Fall through to the normal transport.
      }
    }
    // One request for the whole batch. This loop used to run per ENTRY.
    httpClient.post('/client-logs/batch', payload).catch(() => {});
  }
}

function registerBeaconFlush(): void {
  if (beaconRegistered || typeof window === 'undefined') {
    return;
  }
  beaconRegistered = true;
  // `pagehide` rather than `beforeunload`: it fires for bfcache navigations
  // too, which `beforeunload` misses.
  window.addEventListener('pagehide', () => {
    flushLogs(true);
  });
}

function scheduleFlush(): void {
  registerBeaconFlush();
  if (flushTimer) {
    return;
  }
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushLogs();
  }, CLIENT_LOG_FLUSH_INTERVAL_MS);
}

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

function redactSensitiveFields(details: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    const isKeyLower = key.toLowerCase();
    const isSensitive = LOG_SENSITIVE_KEYS.some((sk) => isKeyLower.includes(sk.toLowerCase()));
    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactSensitiveFields(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function createLogEntry(params: {
  level: LogLevel;
  message: string;
  component: string;
  action: string;
  userId?: string;
  details?: Record<string, unknown>;
}): LogEntry {
  const sanitizedDetails = params.details ? redactSensitiveFields(params.details) : undefined;

  return {
    id: generateId(),
    level: params.level,
    message: params.message,
    component: params.component,
    action: params.action,
    timestamp: new Date().toISOString(),
    userId: params.userId,
    details: sanitizedDetails,
  };
}

function getRoute(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.pathname;
}

function getUserAgent(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return navigator.userAgent;
}

type LogParams = {
  component: string;
  action: string;
  message: string;
  userId?: string;
  details?: Record<string, unknown>;
};

function enqueueForBackend(level: LogLevel, params: LogParams): void {
  if (!passesSeverityGate(level, CLIENT_LOG_MIN_TRANSPORT_LEVEL)) {
    return;
  }
  try {
    const authState = useAuthStore.getState();
    const userId = params.userId ?? authState.user?.id ?? '';

    const request: CreateClientLogRequest = {
      level,
      message: params.message,
      component: params.component,
      action: params.action,
      userId: userId || undefined,
      route: getRoute(),
      userAgent: getUserAgent(),
      metadata: params.details ? redactSensitiveFields(params.details) : undefined,
    };

    logBuffer.push(request);
    if (logBuffer.length > CLIENT_LOG_MAX_BUFFER_EVENTS) {
      // An error loop can outrun the flush interval. Drop the oldest: the
      // newest is usually the one worth having, and growing without bound is
      // not an option in a tab that stays open all day.
      logBuffer = logBuffer.slice(-CLIENT_LOG_MAX_BUFFER_EVENTS);
    }
    scheduleFlush();
  } catch {
    // Logging should never break the app
  }
}

function logAtLevel(level: LogLevel, params: LogParams): void {
  const entry = createLogEntry({ level, ...params });
  useLogStore.getState().addEntry(entry);
  enqueueForBackend(level, params);
}

export const logger = {
  debug(params: LogParams): void {
    logAtLevel(LogLevel.DEBUG, params);
  },

  info(params: LogParams): void {
    logAtLevel(LogLevel.INFO, params);
  },

  warn(params: LogParams): void {
    logAtLevel(LogLevel.WARN, params);
  },

  error(params: LogParams): void {
    logAtLevel(LogLevel.ERROR, params);
  },
};
