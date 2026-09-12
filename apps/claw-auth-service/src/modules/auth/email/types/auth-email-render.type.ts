import type { UserLanguagePreference } from '../../../../generated/prisma';
import type { AuthEmailKind } from '../../enums/auth-email-kind.enum';

/**
 * Everything the renderer needs to turn one AuthEmailCopy entry into a real
 * message. Every field is plain text: the renderer escapes all of it, so no
 * caller can inject markup even with a user-controlled value such as a masked
 * email address.
 */
export type AuthEmailRenderInput = {
  kind: AuthEmailKind;
  locale: UserLanguagePreference;
  /** The recipient's first name, when we have one. */
  recipientName: string | null;
  /** Substituted into {value} in intro/bodyLines. */
  value: string | null;
  /** Substituted into {expiry} in expiryNote, already humanised per locale. */
  expiry: string | null;
  /** Target of the call-to-action button. Null for an email with no action. */
  actionUrl: string | null;
  /** Absolute URL of the site, shown in the footer. */
  siteUrl: string;
};

export type RenderedAuthEmail = {
  subject: string;
  text: string;
  html: string;
};
