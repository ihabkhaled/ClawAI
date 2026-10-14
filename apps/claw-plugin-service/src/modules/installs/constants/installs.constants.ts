import type { ValidationLimits } from '../types/settings-validation.types';

export const CURRENT_KEY_VERSION = 1;
export const CREDENTIAL_AAD_SEPARATOR = ':';
export const CREDENTIAL_VALUE_MAX = 4096;
export const DEFAULT_CREDENTIAL_HEADER = 'Authorization';

export const SETTINGS_MAX_BYTES = 8192;
export const SETTINGS_MAX_DEPTH = 4;
export const SETTINGS_MAX_ARRAY_ITEMS = 100;
export const SETTINGS_MAX_STRING_LENGTH = 2000;

export const SETTINGS_LIMITS: ValidationLimits = {
  maxBytes: SETTINGS_MAX_BYTES,
  maxDepth: SETTINGS_MAX_DEPTH,
  maxArrayItems: SETTINGS_MAX_ARRAY_ITEMS,
  maxStringLength: SETTINGS_MAX_STRING_LENGTH,
};

export const INSTALLS_LIST_MAX = 500;

export const INSTALLS_CACHE_CONTROL = 'private, no-store';

export const PRISMA_FOREIGN_KEY_VIOLATION = 'P2003';
