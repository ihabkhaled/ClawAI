import { emailChangeRepository } from '@/repositories/auth/email-change.repository';
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

export const emailChangeService = {
  request(data: RequestEmailChangeRequest): Promise<RequestEmailChangeResponse> {
    return emailChangeRepository.request(data);
  },

  verifyCurrent(data: ConfirmOldEmailOtpRequest): Promise<ConfirmOldEmailOtpResponse> {
    return emailChangeRepository.verifyCurrent(data);
  },

  resend(data: ResendEmailChangeOtpRequest): Promise<ResendEmailChangeOtpResponse> {
    return emailChangeRepository.resend(data);
  },

  getPending(): Promise<EmailChangePendingState> {
    return emailChangeRepository.getPending();
  },

  cancel(data: CancelEmailChangeRequest): Promise<void> {
    return emailChangeRepository.cancel(data);
  },

  confirm(data: ConfirmEmailChangeRequest): Promise<ConfirmEmailChangeResponse> {
    return emailChangeRepository.confirm(data);
  },
};
