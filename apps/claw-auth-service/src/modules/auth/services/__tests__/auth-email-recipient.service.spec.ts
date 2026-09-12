import { UserLanguagePreference } from '../../../../generated/prisma';
import type { AuthRepository } from '../../repositories/auth.repository';
import { AuthEmailRecipientService } from '../auth-email-recipient.service';

function repository(): { findUserByEmail: jest.Mock; findUserById: jest.Mock } {
  return { findUserByEmail: jest.fn(), findUserById: jest.fn() };
}

describe('AuthEmailRecipientService', () => {
  it('carries the stored language and first name for a known address', async () => {
    const repo = repository();
    repo.findUserByEmail.mockResolvedValue({
      languagePreference: UserLanguagePreference.JA,
      firstName: 'Ada',
    });

    const recipient = await new AuthEmailRecipientService(
      repo as unknown as AuthRepository,
    ).forEmail('ada@example.com');

    expect(recipient).toEqual({
      email: 'ada@example.com',
      locale: UserLanguagePreference.JA,
      firstName: 'Ada',
    });
  });

  // The completion notice goes to an address that has just stopped being the
  // account's, so the lookup legitimately misses. It must still be deliverable.
  it('falls back to English rather than refusing when no user matches', async () => {
    const repo = repository();
    repo.findUserByEmail.mockResolvedValue(null);

    const recipient = await new AuthEmailRecipientService(
      repo as unknown as AuthRepository,
    ).forEmail('gone@example.com');

    expect(recipient).toEqual({
      email: 'gone@example.com',
      locale: UserLanguagePreference.EN,
      firstName: null,
    });
  });

  it('resolves by user id for a freshly registered account', async () => {
    const repo = repository();
    repo.findUserById.mockResolvedValue({
      languagePreference: UserLanguagePreference.AR,
      firstName: null,
    });

    const recipient = await new AuthEmailRecipientService(
      repo as unknown as AuthRepository,
    ).forUserId('user-1', 'new@example.com');

    expect(recipient.locale).toBe(UserLanguagePreference.AR);
    expect(recipient.firstName).toBeNull();
    expect(repo.findUserById).toHaveBeenCalledWith('user-1');
  });

  // A confirmation going to the NEW address must be written in the language of
  // the account making the change, not in the default — the new mailbox has no
  // preference of its own yet.
  it('uses the requesting account language for a message to another address', async () => {
    const repo = repository();
    repo.findUserById.mockResolvedValue({
      languagePreference: UserLanguagePreference.DE,
      firstName: 'Klara',
    });

    const recipient = await new AuthEmailRecipientService(
      repo as unknown as AuthRepository,
    ).forUserIdAtOtherAddress('user-1', 'brand-new@example.com');

    expect(recipient).toEqual({
      email: 'brand-new@example.com',
      locale: UserLanguagePreference.DE,
      firstName: 'Klara',
    });
  });
});
