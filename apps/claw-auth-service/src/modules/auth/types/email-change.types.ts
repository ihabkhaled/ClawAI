import type { EmailChangeStage } from '../enums/email-change-stage.enum';

/** Internal payload returned by the repository after creating a request. */
export interface EmailChangeRequestPayload {
  id: string;
  userId: string;
  newEmail: string;
  stage: EmailChangeStage;
  oldEmailOtpExpiresAt: Date;
  newEmailExpiresAt: Date | null;
  lastSentAt: Date | null;
  activeKey: string | null;
}

/** Sanitized pending state exposed to the UI (no secrets, no hashes). */
export interface PendingEmailChangeState {
  requestId: string;
  stage: EmailChangeStage;
  maskedNewEmail: string;
  expiresAt: Date;
}

/** Result of an OTP verification attempt. */
export interface OtpVerificationResult {
  success: boolean;
  remainingAttempts?: number;
  isCancelled?: boolean;
  newEmailToken?: string;
  newEmailExpiresAt?: Date;
  newEmail?: string;
}

export interface EmailChangeCompletionResult {
  changed: boolean;
  oldEmail?: string;
}
