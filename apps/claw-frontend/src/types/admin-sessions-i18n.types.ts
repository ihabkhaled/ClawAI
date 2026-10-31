import type {
  ADMIN_SESSIONS_ERROR_KEYS,
  ADMIN_SESSIONS_KEYS,
} from '@/constants/admin-sessions-i18n-keys.constants';

/** Keys of the admin sessions dictionary (ADR-204). Every locale must define every key. */
export type AdminSessionsKey = (typeof ADMIN_SESSIONS_KEYS)[number];

export type AdminSessionsErrorKey = (typeof ADMIN_SESSIONS_ERROR_KEYS)[number];

export type AdminSessionsSectionTranslation = Record<AdminSessionsKey, string> & {
  errors: Record<AdminSessionsErrorKey, string>;
};

export type AdminSessionsLocaleTranslation = {
  navigationLabel: string;
  section: AdminSessionsSectionTranslation;
};
