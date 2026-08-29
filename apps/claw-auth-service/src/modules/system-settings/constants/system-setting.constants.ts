// How long a setting is cached in-process before it is re-read from Postgres.
//
// Short on purpose. This is the read path behind the PAYG kill switch, and the
// only reason the switch is a database row rather than an environment variable
// is that flipping it must not need a container recreate during an incident. A
// long TTL would hand that property straight back.
export const SYSTEM_SETTING_CACHE_TTL_MS = 15_000;

// Wire values. Stored as text because `SystemSetting.value` is a single TEXT
// column shared by every setting — a boolean column would only work until the
// second setting needed a number.
export const SYSTEM_SETTING_TRUE = 'true';
export const SYSTEM_SETTING_FALSE = 'false';

export const SYSTEM_SETTING_KEY_MAX_LENGTH = 128;
export const SYSTEM_SETTING_VALUE_MAX_LENGTH = 2048;
