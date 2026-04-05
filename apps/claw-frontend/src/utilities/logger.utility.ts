import { LOG_SENSITIVE_KEYS } from '@/constants';
import { LogLevel } from '@/enums';
import { useLogStore } from '@/stores/log.store';
import type { LogEntry } from '@/types';

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

function redactSensitiveFields(
  details: Record<string, unknown>,
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    const isKeyLower = key.toLowerCase();
    const isSensitive = LOG_SENSITIVE_KEYS.some((sk) =>
      isKeyLower.includes(sk.toLowerCase()),
    );
    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      redacted[key] = redactSensitiveFields(
        value as Record<string, unknown>,
      );
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
  const sanitizedDetails = params.details
    ? redactSensitiveFields(params.details)
    : undefined;

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

type LogParams = {
  component: string;
  action: string;
  message: string;
  userId?: string;
  details?: Record<string, unknown>;
};

function logAtLevel(level: LogLevel, params: LogParams): void {
  const entry = createLogEntry({ level, ...params });
  useLogStore.getState().addEntry(entry);
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
