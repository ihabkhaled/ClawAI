import { UserLanguagePreference } from '../../../../generated/prisma';
import type { AuthEmailDictionaries } from '../types/auth-email-copy.type';

import { AR_AUTH_EMAIL_DICTIONARY } from './ar.copy';
import { DE_AUTH_EMAIL_DICTIONARY } from './de.copy';
import { EN_AUTH_EMAIL_DICTIONARY } from './en.copy';
import { ES_AUTH_EMAIL_DICTIONARY } from './es.copy';
import { FA_AUTH_EMAIL_DICTIONARY } from './fa.copy';
import { FR_AUTH_EMAIL_DICTIONARY } from './fr.copy';
import { HI_AUTH_EMAIL_DICTIONARY } from './hi.copy';
import { IT_AUTH_EMAIL_DICTIONARY } from './it.copy';
import { JA_AUTH_EMAIL_DICTIONARY } from './ja.copy';
import { PT_AUTH_EMAIL_DICTIONARY } from './pt.copy';
import { RU_AUTH_EMAIL_DICTIONARY } from './ru.copy';
import { TH_AUTH_EMAIL_DICTIONARY } from './th.copy';
import { ZH_AUTH_EMAIL_DICTIONARY } from './zh.copy';

/**
 * Every transactional auth email, in every language the product supports.
 *
 * Typed as a total `Record<UserLanguagePreference, …>` on purpose: adding a
 * language to the Prisma enum then breaks the build here until its copy file
 * exists, rather than silently sending that language English. That compile
 * error IS the enforcement — there is no runtime fallback to English by locale,
 * because a silent fallback is indistinguishable from a translation nobody
 * noticed was missing.
 */
export const AUTH_EMAIL_DICTIONARIES: AuthEmailDictionaries = {
  [UserLanguagePreference.EN]: EN_AUTH_EMAIL_DICTIONARY,
  [UserLanguagePreference.AR]: AR_AUTH_EMAIL_DICTIONARY,
  [UserLanguagePreference.FR]: FR_AUTH_EMAIL_DICTIONARY,
  [UserLanguagePreference.IT]: IT_AUTH_EMAIL_DICTIONARY,
  [UserLanguagePreference.DE]: DE_AUTH_EMAIL_DICTIONARY,
  [UserLanguagePreference.ES]: ES_AUTH_EMAIL_DICTIONARY,
  [UserLanguagePreference.RU]: RU_AUTH_EMAIL_DICTIONARY,
  [UserLanguagePreference.PT]: PT_AUTH_EMAIL_DICTIONARY,
  [UserLanguagePreference.HI]: HI_AUTH_EMAIL_DICTIONARY,
  [UserLanguagePreference.JA]: JA_AUTH_EMAIL_DICTIONARY,
  [UserLanguagePreference.TH]: TH_AUTH_EMAIL_DICTIONARY,
  [UserLanguagePreference.FA]: FA_AUTH_EMAIL_DICTIONARY,
  [UserLanguagePreference.ZH]: ZH_AUTH_EMAIL_DICTIONARY,
};
