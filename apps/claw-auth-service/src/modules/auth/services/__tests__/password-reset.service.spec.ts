import { Test, type TestingModule } from '@nestjs/testing';
import { PasswordResetService } from '../password-reset.service';
import { PasswordResetManager } from '../../managers/password-reset.manager';
import { AuthEmailAdapter } from '../../adapters/auth-email.adapter';

jest.mock('../../managers/password-reset.manager');
jest.mock('../../adapters/auth-email.adapter');

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let manager: jest.Mocked<PasswordResetManager>;
  let emailAdapter: jest.Mocked<AuthEmailAdapter>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordResetService, PasswordResetManager, AuthEmailAdapter],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
    manager = module.get(PasswordResetManager);
    emailAdapter = module.get(AuthEmailAdapter);
  });

  describe('requestReset', () => {
    const email = 'user@example.com';

    it('should send a reset email when the address is known', async () => {
      const token = 'reset-token-abc';
      manager.request.mockResolvedValue(token);
      emailAdapter.sendPasswordReset.mockResolvedValue(undefined);

      const result = await service.requestReset(email);

      expect(manager.request).toHaveBeenCalledWith(email);
      expect(emailAdapter.sendPasswordReset).toHaveBeenCalledWith(email, token);
      expect(result).toEqual({ accepted: true });
    });

    it('should not send an email when the address is unknown', async () => {
      manager.request.mockResolvedValue(null);

      const result = await service.requestReset(email);

      expect(manager.request).toHaveBeenCalledWith(email);
      expect(emailAdapter.sendPasswordReset).not.toHaveBeenCalled();
      expect(result).toEqual({ accepted: true });
    });

    it('should not throw when the email adapter rejects', async () => {
      manager.request.mockResolvedValue('token-leaked');
      emailAdapter.sendPasswordReset.mockRejectedValue(new Error('SMTP down'));

      const result = await service.requestReset(email);

      expect(result).toEqual({ accepted: true });
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
});
