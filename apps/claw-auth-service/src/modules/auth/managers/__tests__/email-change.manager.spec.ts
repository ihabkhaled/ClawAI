import { constantTimeTokenHashEquals, hashBearerToken } from '@claw/shared-utilities';
import { AppConfig } from '../../../../app/config/app.config';
import { BusinessException } from '../../../../common/errors';
import { verifyPassword } from '../../../../common/utilities';
import { EMAIL_CHANGE_MAX_REQUESTS_PER_DAY } from '../../constants/email-change.constants';
import { EmailChangeStage } from '../../enums/email-change-stage.enum';
import { EmailChangeManager } from '../email-change.manager';

jest.mock('@claw/shared-utilities', () => ({
  constantTimeTokenHashEquals: jest.fn(),
  hashBearerToken: jest.fn(),
}));
jest.mock('../../../../common/utilities', () => ({ verifyPassword: jest.fn() }));

describe('EmailChangeManager', () => {
  const users = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
  };
  const repository = {
    cancel: jest.fn(),
    consumeAndApplyEmailChange: jest.fn(),
    countRecentForUser: jest.fn(),
    createRequest: jest.fn(),
    findActiveById: jest.fn(),
    findActiveByUserId: jest.fn(),
    markOldEmailVerified: jest.fn(),
    recordOldEmailFailure: jest.fn(),
    updateOldEmailOtp: jest.fn(),
  };
  const manager = new EmailChangeManager(users as never, repository as never);
  const currentUser = {
    id: 'user-1',
    email: 'current@example.com',
    passwordHash: 'password-hash',
  };
  const activeRequest = {
    id: 'request-1',
    userId: 'user-1',
    newEmail: 'new@example.com',
    stage: EmailChangeStage.OLD_EMAIL_PENDING,
    oldEmailOtpHash: 'stored-hash',
    oldEmailOtpExpiresAt: new Date(Date.now() + 60_000),
    oldEmailAttempts: 0,
    lastSentAt: null,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(AppConfig, 'get').mockReturnValue({ JWT_SECRET: 'test-secret' } as never);
    users.findById.mockResolvedValue(currentUser);
    users.findByEmail.mockResolvedValue(null);
    repository.countRecentForUser.mockResolvedValue(0);
    jest.mocked(verifyPassword).mockResolvedValue(true);
    jest.mocked(hashBearerToken).mockReturnValue('hashed-value');
    jest.mocked(constantTimeTokenHashEquals).mockReturnValue(true);
  });

  it('rejects an incorrect current password', async () => {
    jest.mocked(verifyPassword).mockResolvedValue(false);
    await expect(manager.request('user-1', 'wrong', 'new@example.com')).rejects.toThrow(
      BusinessException,
    );
    expect(repository.createRequest).not.toHaveBeenCalled();
  });

  it('rejects the normalized current email', async () => {
    await expect(manager.request('user-1', 'correct', ' CURRENT@EXAMPLE.COM ')).rejects.toThrow(
      BusinessException,
    );
  });

  it('rejects an email owned by another user', async () => {
    users.findByEmail.mockResolvedValue({ id: 'user-2' });
    await expect(manager.request('user-1', 'correct', 'taken@example.com')).rejects.toThrow();
  });

  it('enforces the daily request cap', async () => {
    repository.countRecentForUser.mockResolvedValue(EMAIL_CHANGE_MAX_REQUESTS_PER_DAY);
    await expect(manager.request('user-1', 'correct', 'new@example.com')).rejects.toThrow(
      BusinessException,
    );
  });

  it('increments attempts for a wrong OTP', async () => {
    repository.findActiveById.mockResolvedValue(activeRequest);
    jest.mocked(constantTimeTokenHashEquals).mockReturnValue(false);
    repository.recordOldEmailFailure.mockResolvedValue({
      ...activeRequest,
      oldEmailAttempts: 1,
    });
    await expect(manager.verifyOldEmail('user-1', 'request-1', '000000')).resolves.toEqual({
      success: false,
      remainingAttempts: 4,
      isCancelled: false,
    });
    expect(repository.recordOldEmailFailure).toHaveBeenCalledWith('request-1');
  });

  it('reports cancellation on the fifth wrong OTP', async () => {
    repository.findActiveById.mockResolvedValue(activeRequest);
    jest.mocked(constantTimeTokenHashEquals).mockReturnValue(false);
    repository.recordOldEmailFailure.mockResolvedValue({
      ...activeRequest,
      oldEmailAttempts: 5,
      stage: EmailChangeStage.CANCELLED,
    });
    await expect(manager.verifyOldEmail('user-1', 'request-1', '000000')).resolves.toEqual({
      success: false,
      remainingAttempts: 0,
      isCancelled: true,
    });
  });

  it('rejects an expired OTP without advancing the request', async () => {
    repository.findActiveById.mockResolvedValue({
      ...activeRequest,
      oldEmailOtpExpiresAt: new Date(Date.now() - 1),
    });
    await expect(manager.verifyOldEmail('user-1', 'request-1', '123456')).resolves.toEqual({
      success: false,
    });
    expect(repository.markOldEmailVerified).not.toHaveBeenCalled();
  });

  it('rejects a requestId owned by another user', async () => {
    repository.findActiveById.mockResolvedValue({ ...activeRequest, userId: 'user-2' });
    await expect(manager.verifyOldEmail('user-1', 'request-1', '123456')).resolves.toEqual({
      success: false,
    });
    expect(repository.recordOldEmailFailure).not.toHaveBeenCalled();
  });

  it('persists only a token hash and returns the raw token', async () => {
    repository.findActiveById.mockResolvedValue(activeRequest);
    repository.markOldEmailVerified.mockResolvedValue(true);
    const result = await manager.verifyOldEmail('user-1', 'request-1', '123456');
    expect(result.success).toBe(true);
    expect(result.newEmailToken).toMatch(/^[a-f0-9]{64}$/);
    expect(repository.markOldEmailVerified).toHaveBeenCalledWith(
      'request-1',
      'hashed-value',
      expect.any(Date),
    );
    expect(result.newEmailToken).not.toBe('hashed-value');
  });

  it('enforces the resend cooldown', async () => {
    repository.findActiveById.mockResolvedValue({ ...activeRequest, lastSentAt: new Date() });
    await expect(manager.resendOldEmailOtp('user-1', 'request-1')).rejects.toThrow(
      BusinessException,
    );
    expect(repository.updateOldEmailOtp).not.toHaveBeenCalled();
  });

  it('cancels only a request owned by the current user', async () => {
    repository.findActiveById.mockResolvedValueOnce({ ...activeRequest, userId: 'user-2' });
    await expect(manager.cancel('user-1', 'request-1')).resolves.toBe(false);
    expect(repository.cancel).not.toHaveBeenCalled();
    repository.findActiveById.mockResolvedValueOnce(activeRequest);
    repository.cancel.mockResolvedValue(true);
    await expect(manager.cancel('user-1', 'request-1')).resolves.toBe(true);
  });
});
