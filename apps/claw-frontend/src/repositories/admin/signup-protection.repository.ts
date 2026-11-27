import { apiClient } from '@/services/shared/api-client';
import type {
  EmailDomainCheckResult,
  SignupProtectionStatus,
} from '@/types/admin-security-settings.types';

/**
 * Read-only companions of the Sign-up protection page (auth-service
 * `admin/security/sign-up`, ADMIN + ADMIN_SYSTEM_VIEW): what is really in force
 * (captcha keys saved here OR in the server environment, the built-in list
 * size) and what a sign-up with a given address would get. Never returns a secret.
 */
export const signupProtectionRepository = {
  async getStatus(): Promise<SignupProtectionStatus> {
    const response = await apiClient.get<SignupProtectionStatus>('/admin/security/sign-up/status');
    return response.data;
  },

  /** `value` is an email address or a bare domain; anything else answers 400 VALIDATION_FAILED. */
  async checkEmail(value: string): Promise<EmailDomainCheckResult> {
    const response = await apiClient.get<EmailDomainCheckResult>(
      '/admin/security/sign-up/email-check',
      { value },
    );
    return response.data;
  },
};
