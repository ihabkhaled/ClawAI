import { apiClient } from '@/services/shared/api-client';
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
} from '@/types';

export const emailChangeRepository = {
  async request(data: RequestEmailChangeRequest): Promise<RequestEmailChangeResponse> {
    const response = await apiClient.post<RequestEmailChangeResponse>(
      '/users/me/email-change',
      data,
    );
    return response.data;
  },

  async verifyCurrent(data: ConfirmOldEmailOtpRequest): Promise<ConfirmOldEmailOtpResponse> {
    const response = await apiClient.post<ConfirmOldEmailOtpResponse>(
      '/users/me/email-change/verify-current',
      data,
    );
    return response.data;
  },

  async resend(data: ResendEmailChangeOtpRequest): Promise<ResendEmailChangeOtpResponse> {
    const response = await apiClient.post<ResendEmailChangeOtpResponse>(
      '/users/me/email-change/resend',
      data,
    );
    return response.data;
  },

  async getPending(): Promise<EmailChangePendingState> {
    const response = await apiClient.get<EmailChangePendingState>('/users/me/email-change');
    return response.data;
  },

  async cancel(data: CancelEmailChangeRequest): Promise<void> {
    await apiClient.delete('/users/me/email-change', { data });
  },

  async confirm(data: ConfirmEmailChangeRequest): Promise<ConfirmEmailChangeResponse> {
    const response = await apiClient.post<ConfirmEmailChangeResponse>(
      '/auth/email-change/confirm',
      data,
    );
    return response.data;
  },
};
