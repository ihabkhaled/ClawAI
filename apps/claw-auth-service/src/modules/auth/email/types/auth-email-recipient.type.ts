import type { UserLanguagePreference } from '../../../../generated/prisma';

/**
 * Who an auth email is going to, and in which language.
 *
 * Every adapter method takes one of these instead of a bare `email: string`.
 * That is the whole point of the change: the address alone carries no language,
 * so the send site was structurally incapable of localising anything. Making
 * the recipient a typed object means a new call site cannot forget the locale —
 * it will not compile without one.
 *
 * `firstName` is nullable because the email-change flows address a mailbox
 * rather than a loaded user row; the renderer falls back to a name-free
 * greeting rather than printing an empty space.
 */
export type AuthEmailRecipient = {
  email: string;
  locale: UserLanguagePreference;
  firstName: string | null;
};
