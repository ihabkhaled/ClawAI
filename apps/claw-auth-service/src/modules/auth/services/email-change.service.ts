import { randomUUID } from 'node:crypto';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DuplicateEntityException } from '../../../common/errors';
import { AuthEmailAdapter } from '../adapters/auth-email.adapter';
import { EMAIL_CHANGE_OTP_TTL_MS } from '../constants/email-change.constants';
import { EmailChangeManager } from '../managers/email-change.manager';
import type { PendingEmailChangeState } from '../types/email-change.types';

@Injectable()
export class EmailChangeService {
  private readonly logger = new Logger(EmailChangeService.name);

  constructor(
    private readonly manager: EmailChangeManager,
    private readonly emailAdapter: AuthEmailAdapter,
  ) {}

  async requestEmailChange(
    userId: string,
    currentPassword: string,
    newEmail: string,
  ): Promise<{ requestId: string; expiresAt: Date }> {
    await this.emailAdapter.assertEmailDeliveryAvailable();

    let result: {
      request: { id: string; oldEmailOtpExpiresAt: Date };
      rawOtp: string;
      oldEmail: string;
    };

    try {
      result = await this.manager.request(userId, currentPassword, newEmail);
    } catch (error) {
      if (error instanceof DuplicateEntityException) {
        return {
          requestId: randomUUID(),
          expiresAt: new Date(Date.now() + EMAIL_CHANGE_OTP_TTL_MS),
        };
      }
      throw error;
    }

    const maskedEmail = this.maskEmail(newEmail);

    try {
      await this.emailAdapter.sendEmailChangeOtp(result.oldEmail, result.rawOtp, maskedEmail);
    } catch {
      this.logger.error('Email change OTP delivery failed');
      await this.manager.cancel(userId, result.request.id);
      throw new ServiceUnavailableException(
        'Email delivery is temporarily unavailable. Please try again.',
      );
    }

    return {
      requestId: result.request.id,
      expiresAt: result.request.oldEmailOtpExpiresAt,
    };
  }

  async verifyCurrentEmail(
    userId: string,
    requestId: string,
    otp: string,
  ): Promise<{ pendingEmailSent: boolean }> {
    const result = await this.manager.verifyOldEmail(userId, requestId, otp);

    if (!result.success || !result.newEmailToken || !result.newEmail) {
      return { pendingEmailSent: false };
    }

    try {
      await this.emailAdapter.sendEmailChangeConfirmation(result.newEmail, result.newEmailToken);
    } catch {
      this.logger.error('Email change confirmation delivery failed');
      await this.manager.cancel(userId, requestId);
      throw new ServiceUnavailableException(
        'Email delivery is temporarily unavailable. Please try again.',
      );
    }

    return { pendingEmailSent: true };
  }

  async resendCurrentEmailOtp(userId: string, requestId: string): Promise<{ accepted: true }> {
    const result = await this.manager.resendOldEmailOtp(userId, requestId);
    const maskedEmail = this.maskEmail(result.request.newEmail);

    try {
      await this.emailAdapter.sendEmailChangeOtp(result.oldEmail, result.rawOtp, maskedEmail);
    } catch {
      this.logger.error('Email change OTP delivery failed');
      await this.manager.cancel(userId, requestId);
      throw new ServiceUnavailableException(
        'Email delivery is temporarily unavailable. Please try again.',
      );
    }

    return { accepted: true };
  }

  async getPendingEmailChange(userId: string): Promise<PendingEmailChangeState | null> {
    return this.manager.getPendingState(userId);
  }

  async cancelEmailChange(userId: string, requestId: string): Promise<void> {
    await this.manager.cancel(userId, requestId);
  }

  async confirmEmailChange(rawToken: string): Promise<{ changed: boolean }> {
    const result = await this.manager.confirm(rawToken);

    if (result.changed && result.oldEmail) {
      try {
        await this.emailAdapter.sendEmailChangeCompletedNotice(result.oldEmail);
      } catch {
        this.logger.warn('Email change completion notice delivery failed');
      }
    }

    return { changed: result.changed };
  }

  private maskEmail(email: string): string {
    const atIndex = email.indexOf('@');
    if (atIndex === -1) {
      return '***';
    }
    const local = email.slice(0, atIndex);
    const domain = email.slice(atIndex);
    if (local.length === 0) {
      return `***${domain}`;
    }
    return `${local[0]}***${domain}`;
  }
}
