import { REDACT_KEYS } from '../constants/redact-keys.constants';

export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (key, val) => {
      if (REDACT_KEYS.includes(key.toLowerCase())) {
        return '[REDACTED]';
      }
      if (typeof val === 'bigint') {
        return val.toString();
      }
      return val;
    });
  } catch {
    return '[unserializable]';
  }
}
