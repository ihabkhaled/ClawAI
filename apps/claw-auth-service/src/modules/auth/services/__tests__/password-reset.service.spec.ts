import { Test, type TestingModule } from '@nestjs/testing';
import { PasswordResetService } from '../password-reset.service';
import { PasswordResetManager } from '../../managers/password-reset.manager';
import { AuthEmailAdapter } from '../../adapters/auth-email.adapter';
import { AuthEmailRecipientService } from '../auth-email-recipient.service';
import { EmailDispatchCooldownService } from '../email-dispatch-cooldown.service';
import { EmailDispatchPurpose } from '../../enums/email-dispatch-purpose.enum';
import { PASSWORD_RESET_COOLDOWN_SECONDS } from '../../constants/email-dispatch-cooldown.constants';
import { UserLanguagePreference } from '../../../../generated/prisma';

jest.mock('../../managers/password-reset.manager');
jest.mock('../../adapters/auth-email.adapter');
jest.mock('../auth-email-recipient.service');
jest.mock('../email-dispatch-cooldown.service');

// The reset email is now addressed to a person in a language, not to a string.
const RECIPIENT = {
  email: 'user@example.com',
  locale: UserLanguagePreference.EN,
  firstName: 'Ada',
};

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let manager: jest.Mocked<PasswordResetManager>;
  let emailAdapter: jest.Mocked<AuthEmailAdapter>;
  let recipients: jest.Mocked<AuthEmailRecipientService>;
  let cooldown: jest.Mocked<EmailDispatchCooldownService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        PasswordResetManager,
        AuthEmailAdapter,
        AuthEmailRecipientService,
        EmailDispatchCooldownService,
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
    manager = module.get(PasswordResetManager);
    emailAdapter = module.get(AuthEmailAdapter);
    recipients = module.get(AuthEmailRecipientService);
    recipients.forEmail.mockResolvedValue(RECIPIENT);
    cooldown = module.get(EmailDispatchCooldownService);
    // 0 means "the window was free, go ahead".
    cooldown.claim.mockResolvedValue(0);
  });

  describe('requestReset', () => {
    const email = 'user@example.com';

    it('should send a reset email when the address is known', async () => {
      const token = 'reset-token-abc';
      manager.request.mockResolvedValue(token);
      emailAdapter.sendPasswordReset.mockResolvedValue(undefined);

      const result = await service.requestReset(email);

      expect(manager.request).toHaveBeenCalledWith(email);
      expect(emailAdapter.sendPasswordReset).toHaveBeenCalledWith(RECIPIENT, token);
      expect(result).toEqual({
        accepted: true,
        retryAfterSeconds: PASSWORD_RESET_COOLDOWN_SECONDS,
      });
    });

    it('should not send an email when the address is unknown', async () => {
      manager.request.mockResolvedValue(null);

      const result = await service.requestReset(email);

      expect(manager.request).toHaveBeenCalledWith(email);
      expect(emailAdapter.sendPasswordReset).not.toHaveBeenCalled();
      expect(result).toEqual({
        accepted: true,
        retryAfterSeconds: PASSWORD_RESET_COOLDOWN_SECONDS,
      });
    });

    it('should not throw when the email adapter rejects', async () => {
      manager.request.mockResolvedValue('token-leaked');
      emailAdapter.sendPasswordReset.mockRejectedValue(new Error('SMTP down'));

      const result = await service.requestReset(email);

      expect(result).toEqual({
        accepted: true,
        retryAfterSeconds: PASSWORD_RESET_COOLDOWN_SECONDS,
      });
    });

    it('should never log the raw reset token on failure', async () => {
      const token = 'secret-token-xyz';
      manager.request.mockResolvedValue(token);
      emailAdapter.sendPasswordReset.mockRejectedValue(new Error('SMTP down'));
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await service.requestReset(email);

      const calls = loggerSpy.mock.calls.flat();
      const joined = calls.map(String).join(' ');
      expect(joined).not.toContain(token);
    });
  });

  describe('confirmReset', () => {
    it('should return { reset: true } when the manager confirms', async () => {
      manager.confirm.mockResolvedValue(true);

      const result = await service.confirmReset('token', 'new-password');

      expect(manager.confirm).toHaveBeenCalledWith('token', 'new-password');
      expect(result).toEqual({ reset: true });
    });

    it('should return { reset: false } when the manager rejects', async () => {
      manager.confirm.mockResolvedValue(false);

      const result = await service.confirmReset('token', 'new-password');

      expect(result).toEqual({ reset: false });
    });
  });

  describe('rate limiting', () => {
    it('refuses to send inside the window and reports the remaining time', async () => {
      cooldown.claim.mockResolvedValue(95);

      await expect(service.requestReset('user@example.com')).resolves.toEqual({
        accepted: true,
        retryAfterSeconds: 95,
      });
      expect(emailAdapter.sendPasswordReset).not.toHaveBeenCalled();
      // The cooldown is the FIRST gate — it must not even reach the manager,
      // which is where the account lookup happens.
      expect(manager.request).not.toHaveBeenCalled();
    });

    it('claims the window before knowing whether the account exists', async () => {
      manager.request.mockResolvedValue(null);

      await service.requestReset('nobody@example.com');

      expect(cooldown.claim).toHaveBeenCalledWith(
        EmailDispatchPurpose.PASSWORD_RESET,
        'nobody@example.com',
        PASSWORD_RESET_COOLDOWN_SECONDS,
      );
      const claimOrder = cooldown.claim.mock.invocationCallOrder[0] ?? 0;
      const lookupOrder = manager.request.mock.invocationCallOrder[0] ?? 0;
      expect(claimOrder).toBeLessThan(lookupOrder);
    });

    it('gives a known and an unknown address the identical response', async () => {
      manager.request.mockResolvedValue('token');
      const known = await service.requestReset('user@example.com');
      manager.request.mockResolvedValue(null);
      const unknown = await service.requestReset('nobody@example.com');

      expect(known).toEqual(unknown);
    });
  });
});
