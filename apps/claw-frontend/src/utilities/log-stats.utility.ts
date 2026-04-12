import { LOG_LEVEL_COLORS } from '@/constants';
import { LogLevel } from '@/enums';

export function getLevelBadgeClass(level: string): string {
  const normalized = level.toLowerCase() as LogLevel;
  return LOG_LEVEL_COLORS[normalized] ?? LOG_LEVEL_COLORS[LogLevel.INFO];
}

export function formatLogLatency(ms: number): string {
  if (ms < 1) {
    return '<1ms';
  }
  return `${String(Math.round(ms))}ms`;
}
