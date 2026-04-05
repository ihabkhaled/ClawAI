import { LogLevel } from '@/enums';

export const LOG_MAX_ENTRIES = 500;

export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'bg-gray-100 text-gray-800 border-gray-200',
  [LogLevel.INFO]: 'bg-blue-100 text-blue-800 border-blue-200',
  [LogLevel.WARN]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [LogLevel.ERROR]: 'bg-red-100 text-red-800 border-red-200',
};

export const LOG_SENSITIVE_KEYS: ReadonlyArray<string> = [
  'password',
  'token',
  'secret',
  'apiKey',
  'accessToken',
  'refreshToken',
  'authorization',
] as const;
