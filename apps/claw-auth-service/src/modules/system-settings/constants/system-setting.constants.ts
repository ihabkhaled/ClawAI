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

// Write-only settings (anti-abuse captcha secrets, 2026-11-27): `security.<provider>.secretKey`.
// Every read (list, get, and the reply to a write) returns value '' plus
// `configured`, so a secret never travels back to a browser once it is saved.
export const WRITE_ONLY_SETTING_KEY_PATTERN = /^security\.[A-Za-z0-9_-]+\.secretKey$/u;
export const MASKED_SETTING_VALUE = '';

// Settings under this prefix (anti-abuse, 2026-11-27) may use camelCase keys and
// may be CLEARED with an empty value (empty = unset -> env or default). Every
// other key stays lowercase and needs a non-empty value.
export const SECURITY_SETTING_PREFIX = 'security.';
export const SYSTEM_SETTING_KEY_PATTERN = /^(?:security\.[a-zA-Z0-9._-]+|[a-z0-9][a-z0-9._-]*)$/u;
export const SYSTEM_SETTING_VALUE_REQUIRED_CODE = 'SYSTEM_SETTING_VALUE_REQUIRED';
export const SYSTEM_SETTING_VALUE_REQUIRED_MESSAGE =
  'A value is required; only security.* settings can be cleared';
