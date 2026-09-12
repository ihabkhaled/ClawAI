import { UserLanguagePreference } from '../../../../generated/prisma';

/**
 * The visual identity of every transactional auth email, in the only form
 * email clients honour: literal inline values. There is no Tailwind here and
 * there cannot be — Gmail, Outlook and Apple Mail all strip `<style>` blocks —
 * so these constants ARE the design system for email.
 */
export const AUTH_EMAIL_THEME = {
  brandName: 'ClawAI',
  fontStack: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  pageColor: '#f4f5f7',
  cardColor: '#ffffff',
  borderColor: '#e4e6eb',
  headingColor: '#11131a',
  bodyColor: '#33363f',
  mutedColor: '#6b7080',
  accentColor: '#4f46e5',
  accentTextColor: '#ffffff',
} as const;

/**
 * The locales whose readers expect a right-to-left layout. Sending a fully
 * translated Arabic email laid out left-to-right is worse than not translating
 * it: it reads as a machine mistake rather than a considered message.
 */
export const AUTH_EMAIL_RTL_LOCALES: ReadonlySet<UserLanguagePreference> = new Set([
  UserLanguagePreference.AR,
  UserLanguagePreference.FA,
]);
