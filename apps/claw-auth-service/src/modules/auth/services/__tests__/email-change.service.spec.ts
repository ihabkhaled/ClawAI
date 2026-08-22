import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { DuplicateEntityException } from '../../../../common/errors';
import { AuthEmailAdapter } from '../../adapters/auth-email.adapter';
import { EMAIL_CHANGE_OTP_TTL_MS } from '../../constants/email-change.constants';
import { EmailChangeManager } from '../../managers/email-change.manager';
import { EmailChangeService } from '../email-change.service';

describe('EmailChangeService', () => {
  let service: EmailChangeService;
  const manager = {
    cancel: jest.fn(),
    confirm: jest.fn(),
    getPendingState: jest.fn(),
    request: jest.fn(),
    resendOldEmailOtp: jest.fn(),
    verifyOldEmail: jest.fn(),
  };
  const emailAdapter = {
    assertEmailDeliveryAvailable: jest.fn(),
    sendEmailChangeCompletedNotice: jest.fn(),
    sendEmailChangeConfirmation: jest.fn(),
    sendEmailChangeOtp: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailChangeService,
        { provide: EmailChangeManager, useValue: manager },
        { provide: AuthEmailAdapter, useValue: emailAdapter },
      ],
    }).compile();
    service = module.get(EmailChangeService);
  });

  it('checks delivery before creating a request and returns the request details', async () => {
    const expiresAt = new Date(Date.now() + EMAIL_CHANGE_OTP_TTL_MS);
    manager.request.mockResolvedValue({
      request: { id: 'request-1', oldEmailOtpExpiresAt: expiresAt },
      rawOtp: '123456',
      oldEmail: 'old@example.com',
    });

    await expect(
      service.requestEmailChange('user-1', 'current-password', 'new@example.com'),
    ).resolves.toEqual({ requestId: 'request-1', expiresAt });
    expect(emailAdapter.assertEmailDeliveryAvailable.mock.invocationCallOrder[0]).toBeLessThan(
      manager.request.mock.invocationCallOrder[0]!,
    );
    expect(emailAdapter.sendEmailChangeOtp).toHaveBeenCalledWith(
      'old@example.com',
      '123456',
      'n***@example.com',
    );
  });

  it('returns the same neutral response shape for free and taken email addresses', async () => {
    const expiresAt = new Date(Date.now() + EMAIL_CHANGE_OTP_TTL_MS);
    manager.request.mockResolvedValueOnce({
      request: { id: 'request-1', oldEmailOtpExpiresAt: expiresAt },
      rawOtp: '123456',
      oldEmail: 'old@example.com',
    });
    const free = await service.requestEmailChange('user-1', 'current-password', 'free@example.com');
    manager.request.mockRejectedValueOnce(new DuplicateEntityException('User', 'email'));
    const taken = await service.requestEmailChange(
      'user-1',
      'current-password',
      'taken@example.com',
    );

    expect(Object.keys(taken)).toEqual(Object.keys(free));
    expect(typeof taken.requestId).toBe(typeof free.requestId);
    expect(taken.expiresAt).toBeInstanceOf(Date);
  });

  it('cancels and returns a generic error when OTP delivery fails', async () => {
    manager.request.mockResolvedValue({
      request: { id: 'request-1', oldEmailOtpExpiresAt: new Date() },
      rawOtp: '123456',
      oldEmail: 'old@example.com',
    });
    emailAdapter.sendEmailChangeOtp.mockRejectedValue(new Error('secret SMTP detail'));

    await expect(
      service.requestEmailChange('user-1', 'current-password', 'new@example.com'),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(manager.cancel).toHaveBeenCalledWith('user-1', 'request-1');
  });

  it('returns false when current-email verification fails', async () => {
    manager.verifyOldEmail.mockResolvedValue({ success: false });
    await expect(service.verifyCurrentEmail('user-1', 'request-1', '000000')).resolves.toEqual({
      pendingEmailSent: false,
    });
    expect(emailAdapter.sendEmailChangeConfirmation).not.toHaveBeenCalled();
  });

  it('sends the new-email confirmation after successful OTP verification', async () => {
    manager.verifyOldEmail.mockResolvedValue({
      success: true,
      newEmail: 'new@example.com',
      newEmailToken: 'raw-token',
    });
    await expect(service.verifyCurrentEmail('user-1', 'request-1', '123456')).resolves.toEqual({
      pendingEmailSent: true,
    });
    expect(emailAdapter.sendEmailChangeConfirmation).toHaveBeenCalledWith(
      'new@example.com',
      'raw-token',
    );
  });

  it('cancels when new-email confirmation delivery fails', async () => {
    manager.verifyOldEmail.mockResolvedValue({
      success: true,
      newEmail: 'new@example.com',
      newEmailToken: 'raw-token',
    });
    emailAdapter.sendEmailChangeConfirmation.mockRejectedValue(new Error('delivery failed'));
    await expect(service.verifyCurrentEmail('user-1', 'request-1', '123456')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(manager.cancel).toHaveBeenCalledWith('user-1', 'request-1');
  });

  it('resends the current-email OTP', async () => {
    manager.resendOldEmailOtp.mockResolvedValue({
      request: { newEmail: 'new@example.com' },
      rawOtp: '654321',
      oldEmail: 'old@example.com',
    });
    await expect(service.resendCurrentEmailOtp('user-1', 'request-1')).resolves.toEqual({
      accepted: true,
    });
    expect(emailAdapter.sendEmailChangeOtp).toHaveBeenCalledWith(
      'old@example.com',
      '654321',
      'n***@example.com',
    );
  });

  it('cancels when resent OTP delivery fails', async () => {
    manager.resendOldEmailOtp.mockResolvedValue({
      request: { newEmail: 'new@example.com' },
      rawOtp: '654321',
      oldEmail: 'old@example.com',
    });
    emailAdapter.sendEmailChangeOtp.mockRejectedValue(new Error('delivery failed'));
    await expect(service.resendCurrentEmailOtp('user-1', 'request-1')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(manager.cancel).toHaveBeenCalledWith('user-1', 'request-1');
  });

  it('delegates pending state and cancellation', async () => {
    const pending = { requestId: 'request-1' };
    manager.getPendingState.mockResolvedValue(pending);
    await expect(service.getPendingEmailChange('user-1')).resolves.toBe(pending);
    await service.cancelEmailChange('user-1', 'request-1');
    expect(manager.getPendingState).toHaveBeenCalledWith('user-1');
    expect(manager.cancel).toHaveBeenCalledWith('user-1', 'request-1');
  });

  it('sends the old-address notice after a completed change', async () => {
    manager.confirm.mockResolvedValue({ changed: true, oldEmail: 'old@example.com' });
    await expect(service.confirmEmailChange('raw-token')).resolves.toEqual({ changed: true });
    expect(emailAdapter.sendEmailChangeCompletedNotice).toHaveBeenCalledWith('old@example.com');
  });

  it('swallows only completion-notice delivery failure', async () => {
    const warning = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    manager.confirm.mockResolvedValue({ changed: true, oldEmail: 'old@example.com' });
    emailAdapter.sendEmailChangeCompletedNotice.mockRejectedValue(new Error('delivery failed'));
    await expect(service.confirmEmailChange('raw-token')).resolves.toEqual({ changed: true });
    expect(warning).toHaveBeenCalledWith('Email change completion notice delivery failed');
    warning.mockRestore();
  });
});
