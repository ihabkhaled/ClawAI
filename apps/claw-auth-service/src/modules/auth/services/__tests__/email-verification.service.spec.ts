import { AppConfig } from '../../../../app/config/app.config';
import { EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS } from '../../constants/email-verification.constants';
import { EmailVerificationService } from '../email-verification.service';
import type { AuthEmailAdapter } from '../../adapters/auth-email.adapter';
import type { AuthEmailRecipientService } from '../auth-email-recipient.service';
import type { AuthRepository } from '../../repositories/auth.repository';
import type { EmailVerificationRepository } from '../../repositories/email-verification.repository';
import { EmailDispatchPurpose } from '../../enums/email-dispatch-purpose.enum';
import type { EmailDispatchCooldownService } from '../email-dispatch-cooldown.service';

function build(): {
  service: EmailVerificationService;
  repository: { replaceForUser: jest.Mock; consumeAndActivate: jest.Mock };
  authRepository: { findUserByEmail: jest.Mock };
  emailAdapter: { sendVerification: jest.Mock };
  cooldown: { claim: jest.Mock };
} {
  const repository = { replaceForUser: jest.fn(), consumeAndActivate: jest.fn() };
  const authRepository = { findUserByEmail: jest.fn() };
  const emailAdapter = { sendVerification: jest.fn().mockResolvedValue(undefined) };
  const recipients = { forUserId: jest.fn().mockResolvedValue({ email: 'a@b.c' }) };
  const cooldown = { claim: jest.fn() };
  return {
    service: new EmailVerificationService(
      repository as unknown as EmailVerificationRepository,
      authRepository as unknown as AuthRepository,
      emailAdapter as unknown as AuthEmailAdapter,
      recipients as unknown as AuthEmailRecipientService,
      cooldown as unknown as EmailDispatchCooldownService,
    ),
    repository,
    authRepository,
    emailAdapter,
    cooldown,
  };
}

describe('EmailVerificationService.resend', () => {
  beforeEach(() => {
    jest
      .spyOn(AppConfig, 'get')
      .mockReturnValue({ JWT_SECRET: 'x'.repeat(32) } as ReturnType<typeof AppConfig.get>);
  });

  afterEach(() => jest.restoreAllMocks());

  it('sends and reports the full cooldown when the window was free', async () => {
    const ctx = build();
    ctx.cooldown.claim.mockResolvedValue(0);
    ctx.authRepository.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      emailVerifiedAt: null,
    });

    await expect(ctx.service.resend('ada@example.com')).resolves.toEqual({
      accepted: true,
      retryAfterSeconds: EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
    });
    expect(ctx.emailAdapter.sendVerification).toHaveBeenCalledTimes(1);
  });

  it('refuses to send again inside the window and reports the remaining time', async () => {
    const ctx = build();
    ctx.cooldown.claim.mockResolvedValue(42);

    await expect(ctx.service.resend('ada@example.com')).resolves.toEqual({
      accepted: true,
      retryAfterSeconds: 42,
    });
    expect(ctx.emailAdapter.sendVerification).not.toHaveBeenCalled();
    // It must not even look the account up — the cooldown is the first gate.
    expect(ctx.authRepository.findUserByEmail).not.toHaveBeenCalled();
  });

  // The heart of it: if the cooldown only applied to real accounts, the absence
  // of a cooldown would answer "is this address registered?" — the exact
  // question this endpoint refuses to answer (rule 43 §1).
  it('claims the cooldown before knowing whether the account exists', async () => {
    const ctx = build();
    ctx.cooldown.claim.mockResolvedValue(0);
    ctx.authRepository.findUserByEmail.mockResolvedValue(null);

    await expect(ctx.service.resend('nobody@example.com')).resolves.toEqual({
      accepted: true,
      retryAfterSeconds: EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
    });
    expect(ctx.cooldown.claim).toHaveBeenCalledTimes(1);
    expect(ctx.emailAdapter.sendVerification).not.toHaveBeenCalled();
  });

  it('gives an unknown address and a real one the identical response', async () => {
    const known = build();
    known.cooldown.claim.mockResolvedValue(0);
    known.authRepository.findUserByEmail.mockResolvedValue({
      id: 'u',
      email: 'ada@example.com',
      emailVerifiedAt: null,
    });

    const unknown = build();
    unknown.cooldown.claim.mockResolvedValue(0);
    unknown.authRepository.findUserByEmail.mockResolvedValue(null);

    expect(await known.service.resend('ada@example.com')).toEqual(
      await unknown.service.resend('nobody@example.com'),
    );
  });

  it('sends nothing for an address that is already verified', async () => {
    const ctx = build();
    ctx.cooldown.claim.mockResolvedValue(0);
    ctx.authRepository.findUserByEmail.mockResolvedValue({
      id: 'u',
      email: 'ada@example.com',
      emailVerifiedAt: new Date(),
    });

    await ctx.service.resend('ada@example.com');
    expect(ctx.emailAdapter.sendVerification).not.toHaveBeenCalled();
  });

  // Hashing and normalisation moved into EmailDispatchCooldownService, which is
  // where both email-sending endpoints now share one implementation. What this
  // service still owns is passing the right purpose and the raw address.
  it('delegates to the shared cooldown under its own purpose', async () => {
    const ctx = build();
    ctx.cooldown.claim.mockResolvedValue(0);
    ctx.authRepository.findUserByEmail.mockResolvedValue(null);

    await ctx.service.resend('ada@example.com');

    expect(ctx.cooldown.claim).toHaveBeenCalledWith(
      EmailDispatchPurpose.EMAIL_VERIFICATION,
      'ada@example.com',
      EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
    );
  });
});
