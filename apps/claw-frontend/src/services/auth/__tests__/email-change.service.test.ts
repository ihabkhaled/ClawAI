import { describe, it, expect, vi, type Mock } from 'vitest';

import { emailChangeRepository } from '@/repositories/auth/email-change.repository';
import type {
  CancelEmailChangeRequest,
  ConfirmEmailChangeRequest,
  ConfirmOldEmailOtpRequest,
  RequestEmailChangeRequest,
  ResendEmailChangeOtpRequest,
} from '@/types';

import { emailChangeService } from '../email-change.service';

vi.mock('@/repositories/auth/email-change.repository');

describe('emailChangeService', () => {
  it('should call emailChangeRepository.request with correct data', async () => {
    const data: RequestEmailChangeRequest = {
      newEmail: 'new@example.com',
      currentPassword: 'password123',
    };
    await emailChangeService.request(data);
    expect(emailChangeRepository.request).toHaveBeenCalledWith(data);
  });

  it('should call emailChangeRepository.verifyCurrent with correct data', async () => {
    const data: ConfirmOldEmailOtpRequest = { requestId: 'req-123', otp: '123456' };
    await emailChangeService.verifyCurrent(data);
    expect(emailChangeRepository.verifyCurrent).toHaveBeenCalledWith(data);
  });

  it('should call emailChangeRepository.resend with correct data', async () => {
    const data: ResendEmailChangeOtpRequest = { requestId: 'req-123' };
    await emailChangeService.resend(data);
    expect(emailChangeRepository.resend).toHaveBeenCalledWith(data);
  });

  it('should call emailChangeRepository.getPending', async () => {
    await emailChangeService.getPending();
    expect(emailChangeRepository.getPending).toHaveBeenCalled();
  });

  it('should call emailChangeRepository.cancel with correct data', async () => {
    const data: CancelEmailChangeRequest = { requestId: 'req-123' };
    await emailChangeService.cancel(data);
    expect(emailChangeRepository.cancel).toHaveBeenCalledWith(data);
  });

  it('should call emailChangeRepository.confirm with correct data', async () => {
    const data: ConfirmEmailChangeRequest = { token: 'some-token' };
    await emailChangeService.confirm(data);
    expect(emailChangeRepository.confirm).toHaveBeenCalledWith(data);
  });

  it('should handle repository errors', async () => {
    const error = new Error('Repository failed');
    (emailChangeRepository.request as Mock).mockRejectedValue(error);
    const data: RequestEmailChangeRequest = {
      newEmail: 'fail@example.com',
      currentPassword: 'password123',
    };
    await expect(emailChangeService.request(data)).rejects.toThrow(error);
  });
});
