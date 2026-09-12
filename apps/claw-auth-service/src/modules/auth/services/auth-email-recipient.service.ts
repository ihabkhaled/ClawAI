import { Injectable } from '@nestjs/common';
import { UserLanguagePreference } from '../../../generated/prisma';
import { AuthRepository } from '../repositories/auth.repository';
import type { AuthEmailRecipient } from '../email/types/auth-email-recipient.type';

/**
 * Turns "an address we need to email" into "a person, and the language they
 * read in".
 *
 * Every send site previously had only a bare address, which is why nothing was
 * ever localised: the language lives on the user row, and the row was not in
 * scope. This resolver is the single place that bridges the two, so a send site
 * never has to know how a locale is stored.
 *
 * It NEVER throws and never refuses to produce a recipient. An email whose
 * address has no matching user — the completion notice sent to an address that
 * has just stopped being the account's, for instance — still has to be
 * delivered; it simply falls back to English, which is the same default the
 * column itself carries.
 */
@Injectable()
export class AuthEmailRecipientService {
  constructor(private readonly authRepository: AuthRepository) {}

  async forEmail(email: string): Promise<AuthEmailRecipient> {
    const user = await this.authRepository.findUserByEmail(email);
    if (user === null) {
      return { email, locale: UserLanguagePreference.EN, firstName: null };
    }
    return { email, locale: user.languagePreference, firstName: user.firstName };
  }

  async forUserId(userId: string, email: string): Promise<AuthEmailRecipient> {
    const user = await this.authRepository.findUserById(userId);
    if (user === null) {
      return { email, locale: UserLanguagePreference.EN, firstName: null };
    }
    return { email, locale: user.languagePreference, firstName: user.firstName };
  }

  /**
   * The recipient for a message going to an address that is NOT the account's
   * own — the new address during an email change, before it belongs to anyone.
   * The language and name come from the account making the change, because that
   * is whose message it is, even though it is arriving somewhere else.
   */
  async forUserIdAtOtherAddress(userId: string, email: string): Promise<AuthEmailRecipient> {
    return this.forUserId(userId, email);
  }
}
