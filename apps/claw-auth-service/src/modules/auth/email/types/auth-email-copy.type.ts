import type { UserLanguagePreference } from '../../../../generated/prisma';
import type { AuthEmailKind } from '../../enums/auth-email-kind.enum';

/**
 * The text of one transactional email, in one language.
 *
 * It is data, not markup: the layout utility owns every tag, so a translator
 * can never break the HTML and an interpolated value can never escape into it.
 * Fields that some emails do not need are `null` rather than absent, so a new
 * locale that forgets one fails to compile instead of shipping a blank line.
 *
 * `{value}` and `{expiry}` are the only placeholders. They are substituted with
 * HTML-escaped text — see renderAuthEmail.
 */
export type AuthEmailCopy = {
  /** Subject line. No placeholders — some clients truncate hard. */
  subject: string;
  /** The grey preview line an inbox shows beside the subject. */
  preheader: string;
  /** The <h1> inside the email body. */
  heading: string;
  /** Opening paragraph. May contain {value}. */
  intro: string;
  /** Body paragraphs after the intro. May contain {value}. */
  bodyLines: string[];
  /** Call-to-action button label, or null for an email with no action. */
  actionLabel: string | null;
  /** "If the button does not work, paste this link" — null when no action. */
  fallbackNote: string | null;
  /** How long the link or code stays valid. May contain {expiry}. */
  expiryNote: string | null;
  /** What to do if this email was not expected. Always present. */
  securityNote: string;
};

/**
 * The parts that wrap EVERY auth email in a given language: the greeting, the
 * sign-off and the footer. Kept separate from AuthEmailCopy so translating a
 * new email kind does not mean re-translating the chrome around it.
 */
export type AuthEmailChrome = {
  /** Greeting line. Contains {value} — the recipient's first name. */
  greeting: string;
  /** Greeting used when we do not know the recipient's name. */
  greetingFallback: string;
  signOff: string;
  teamName: string;
  /** Small print under the rule at the foot of the message. */
  footerNote: string;
  /** Label on the plain-text link that repeats the action URL. */
  linkLabel: string;
};

export type AuthEmailDictionary = {
  chrome: AuthEmailChrome;
  emails: Record<AuthEmailKind, AuthEmailCopy>;
};

export type AuthEmailDictionaries = Record<UserLanguagePreference, AuthEmailDictionary>;
