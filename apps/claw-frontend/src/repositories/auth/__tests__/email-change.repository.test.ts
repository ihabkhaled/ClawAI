import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailChangeStage } from '../../../enums';
import { apiClient } from '../../../services/shared/api-client';
import type {
  CancelEmailChangeRequest,
  ConfirmEmailChangeRequest,
  ConfirmEmailChangeResponse,
  ConfirmOldEmailOtpRequest,
  ConfirmOldEmailOtpResponse,
  EmailChangePendingState,
  RequestEmailChangeRequest,
  RequestEmailChangeResponse,
  ResendEmailChangeOtpRequest,
  ResendEmailChangeOtpResponse,
} from '../../../types';
import { emailChangeRepository } from '../email-change.repository';

vi.mock('@/services/shared/api-client');

describe('emailChangeRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- request ----------

  describe('request', () => {
    it('posts to /users/me/email-change with the new email and password', async () => {
      const requestPayload: RequestEmailChangeRequest = {
        newEmail: 'new@example.com',
        currentPassword: 'CurrentPass1!',
      };
      const responsePayload: RequestEmailChangeResponse = {
        requestId: 'request-id-123',
        expiresAt: new Date().toISOString(),
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: responsePayload, status: 200 });

      const result = await emailChangeRepository.request(requestPayload);

      expect(apiClient.post).toHaveBeenCalledWith('/users/me/email-change', requestPayload);
      expect(result).toEqual(responsePayload);
    });

    it('propagates errors from apiClient', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'));

      const payload: RequestEmailChangeRequest = {
        newEmail: 'new@example.com',
        currentPassword: 'CurrentPass1!',
      };

      await expect(emailChangeRepository.request(payload)).rejects.toThrow('Network error');
    });
  });

  // ---------- verifyCurrent ----------

  describe('verifyCurrent', () => {
    it('posts to /users/me/email-change/verify-current with the OTP', async () => {
      const requestPayload: ConfirmOldEmailOtpRequest = {
        requestId: 'request-id-123',
        otp: '123456',
      };
      const responsePayload: ConfirmOldEmailOtpResponse = {
        pendingEmailSent: true,
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: responsePayload, status: 200 });

      const result = await emailChangeRepository.verifyCurrent(requestPayload);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/users/me/email-change/verify-current',
        requestPayload,
      );
      expect(result).toEqual(responsePayload);
    });
  });

  // ---------- resend ----------

  describe('resend', () => {
    it('posts to /users/me/email-change/resend to get a new OTP', async () => {
      const requestPayload: ResendEmailChangeOtpRequest = {
        requestId: 'request-id-123',
      };
      const responsePayload: ResendEmailChangeOtpResponse = {
        accepted: true,
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: responsePayload, status: 200 });

      const result = await emailChangeRepository.resend(requestPayload);

      expect(apiClient.post).toHaveBeenCalledWith('/users/me/email-change/resend', requestPayload);
      expect(result).toEqual(responsePayload);
    });
  });

  // ---------- getPending ----------

  describe('getPending', () => {
    it('gets /users/me/email-change for the current pending state', async () => {
      const responsePayload: EmailChangePendingState = {
        requestId: 'request-id-123',
        stage: EmailChangeStage.OldEmailPending,
        maskedNewEmail: 'n**@e******.com',
        expiresAt: new Date().toISOString(),
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: responsePayload, status: 200 });

      const result = await emailChangeRepository.getPending();

      expect(apiClient.get).toHaveBeenCalledWith('/users/me/email-change');
      expect(result).toEqual(responsePayload);
    });
  });

  // ---------- cancel ----------

  describe('cancel', () => {
    it('deletes /users/me/email-change to cancel the request', async () => {
      const requestPayload: CancelEmailChangeRequest = {
        requestId: 'request-id-123',
      };
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined, status: 204 });

      await emailChangeRepository.cancel(requestPayload);

      expect(apiClient.delete).toHaveBeenCalledWith('/users/me/email-change', {
        data: requestPayload,
      });
    });
  });

  // ---------- confirm ----------

  describe('confirm', () => {
    it('posts to /auth/email-change/confirm to finalize the change', async () => {
      const requestPayload: ConfirmEmailChangeRequest = {
        token: 'public-confirm-token',
      };
      const responsePayload: ConfirmEmailChangeResponse = {
        changed: true,
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: responsePayload, status: 200 });

      const result = await emailChangeRepository.confirm(requestPayload);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/email-change/confirm', requestPayload);
      expect(result).toEqual(responsePayload);
    });
  });
});
