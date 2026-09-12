import { UserLanguagePreference } from '../../../../generated/prisma';

/**
 * How long each link or code stays valid, phrased for a reader rather than a
 * machine, in every supported language.
 *
 * This lives beside the copy instead of being formatted at the call site
 * because "24 hours" is not a number with a unit glued on: Russian declines the
 * noun by count, Arabic has a dual form, and Japanese and Chinese place the
 * counter differently. A generic `${n} ${unit}` helper produces text that is
 * grammatically wrong in most of these languages, which is exactly the kind of
 * detail that makes a translated email read as machine output.
 *
 * The durations themselves are owned by the token constants
 * (EMAIL_VERIFICATION_TOKEN_TTL_MS, PASSWORD_RESET_TOKEN_TTL_SECONDS,
 * EMAIL_CHANGE_OTP_TTL); these strings describe them and are kept in step by
 * auth-email-expiry.constants.spec.ts.
 */
export const AUTH_EMAIL_EXPIRY_24_HOURS: Record<UserLanguagePreference, string> = {
  [UserLanguagePreference.EN]: '24 hours',
  [UserLanguagePreference.AR]: '٢٤ ساعة',
  [UserLanguagePreference.FR]: '24 heures',
  [UserLanguagePreference.IT]: '24 ore',
  [UserLanguagePreference.DE]: '24 Stunden',
  [UserLanguagePreference.ES]: '24 horas',
  [UserLanguagePreference.RU]: '24 часа',
  [UserLanguagePreference.PT]: '24 horas',
  [UserLanguagePreference.HI]: '24 घंटे',
  [UserLanguagePreference.JA]: '24 時間',
  [UserLanguagePreference.TH]: '24 ชั่วโมง',
  [UserLanguagePreference.FA]: '۲۴ ساعت',
  [UserLanguagePreference.ZH]: '24 小时',
};

export const AUTH_EMAIL_EXPIRY_1_HOUR: Record<UserLanguagePreference, string> = {
  [UserLanguagePreference.EN]: '1 hour',
  [UserLanguagePreference.AR]: 'ساعة واحدة',
  [UserLanguagePreference.FR]: '1 heure',
  [UserLanguagePreference.IT]: '1 ora',
  [UserLanguagePreference.DE]: '1 Stunde',
  [UserLanguagePreference.ES]: '1 hora',
  [UserLanguagePreference.RU]: '1 час',
  [UserLanguagePreference.PT]: '1 hora',
  [UserLanguagePreference.HI]: '1 घंटा',
  [UserLanguagePreference.JA]: '1 時間',
  [UserLanguagePreference.TH]: '1 ชั่วโมง',
  [UserLanguagePreference.FA]: 'یک ساعت',
  [UserLanguagePreference.ZH]: '1 小时',
};

export const AUTH_EMAIL_EXPIRY_10_MINUTES: Record<UserLanguagePreference, string> = {
  [UserLanguagePreference.EN]: '10 minutes',
  [UserLanguagePreference.AR]: '١٠ دقائق',
  [UserLanguagePreference.FR]: '10 minutes',
  [UserLanguagePreference.IT]: '10 minuti',
  [UserLanguagePreference.DE]: '10 Minuten',
  [UserLanguagePreference.ES]: '10 minutos',
  [UserLanguagePreference.RU]: '10 минут',
  [UserLanguagePreference.PT]: '10 minutos',
  [UserLanguagePreference.HI]: '10 मिनट',
  [UserLanguagePreference.JA]: '10 分',
  [UserLanguagePreference.TH]: '10 นาที',
  [UserLanguagePreference.FA]: 'ده دقیقه',
  [UserLanguagePreference.ZH]: '10 分钟',
};

export const AUTH_EMAIL_EXPIRY_30_MINUTES: Record<UserLanguagePreference, string> = {
  [UserLanguagePreference.EN]: '30 minutes',
  [UserLanguagePreference.AR]: '٣٠ دقيقة',
  [UserLanguagePreference.FR]: '30 minutes',
  [UserLanguagePreference.IT]: '30 minuti',
  [UserLanguagePreference.DE]: '30 Minuten',
  [UserLanguagePreference.ES]: '30 minutos',
  [UserLanguagePreference.RU]: '30 минут',
  [UserLanguagePreference.PT]: '30 minutos',
  [UserLanguagePreference.HI]: '30 मिनट',
  [UserLanguagePreference.JA]: '30 分',
  [UserLanguagePreference.TH]: '30 นาที',
  [UserLanguagePreference.FA]: 'سی دقیقه',
  [UserLanguagePreference.ZH]: '30 分钟',
};
