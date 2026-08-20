import { randomBytes } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { constantTimeTokenHashEquals, hashBearerToken } from '@claw/shared-utilities';
import { AppConfig } from '../../../app/config/app.config';
import {
  BusinessException,
  DuplicateEntityException,
  EntityNotFoundException,
} from '../../../common/errors';
import { verifyPassword } from '../../../common/utilities';
import type { EmailChangeRequest } from '../../../generated/prisma';
import { UsersRepository } from '../../users/repositories/users.repository';
import {
  EMAIL_CHANGE_MAX_REQUESTS_PER_DAY,
  EMAIL_CHANGE_NEW_EMAIL_TOKEN_BYTES,
  EMAIL_CHANGE_NEW_EMAIL_TOKEN_TTL_MS,
  EMAIL_CHANGE_OTP_MAX_ATTEMPTS,
  EMAIL_CHANGE_OTP_TTL_MS,
  EMAIL_CHANGE_RESEND_COOLDOWN_MS,
} from '../constants/email-change.constants';
import { EmailChangeStage } from '../enums/email-change-stage.enum';
import { EmailChangeRepository } from '../repositories/email-change.repository';
import type {
  EmailChangeCompletionResult,
  OtpVerificationResult,
  PendingEmailChangeState,
} from '../types/email-change.types';
import { generateNumericOtp, normalizeEmail } from '../utilities/email-change-otp.utility';

@Injectable()
export class EmailChangeManager {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly emailChangeRepository: EmailChangeRepository,
  ) {}

  async request(
    userId: string,
    currentPassword: string,
    requestedEmail: string,
  ): Promise<{ request: EmailChangeRequest; rawOtp: string; oldEmail: string }> {
    const user = await this.usersRepository.findById(userId);
    if (user === null) {
      throw new EntityNotFoundException('User', userId);
    }

    const passwordMatches = await verifyPassword(user.passwordHash, currentPassword);
    if (!passwordMatches) {
      throw new BusinessException(
        'Current password is incorrect',
        'INVALID_CURRENT_PASSWORD',
        HttpStatus.BAD_REQUEST,
      );
    }

    const newEmail = normalizeEmail(requestedEmail);
    if (newEmail === normalizeEmail(user.email)) {
      throw new BusinessException(
        'New email address must differ from your current email',
        'EMAIL_CHANGE_SAME_ADDRESS',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingOwner = await this.usersRepository.findByEmail(newEmail);
    if (existingOwner !== null) {
      throw new DuplicateEntityException('User', 'email');
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await this.emailChangeRepository.countRecentForUser(userId, since);
    if (recentCount >= EMAIL_CHANGE_MAX_REQUESTS_PER_DAY) {
      throw new BusinessException(
        'Daily email change request limit reached. Please try again tomorrow.',
        'EMAIL_CHANGE_DAILY_LIMIT',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const rawOtp = generateNumericOtp();
    const oldEmailOtpHash = hashBearerToken(
      rawOtp,
      `email-change-old:${AppConfig.get().JWT_SECRET}`,
    );
    const now = new Date();
    const request = await this.emailChangeRepository.createRequest({
      user: { connect: { id: userId } },
      newEmail,
      stage: EmailChangeStage.OLD_EMAIL_PENDING,
      oldEmailOtpHash,
      oldEmailOtpExpiresAt: new Date(now.getTime() + EMAIL_CHANGE_OTP_TTL_MS),
      lastSentAt: now,
      activeKey: userId,
    });

    return { request, rawOtp, oldEmail: user.email };
  }

  async verifyOldEmail(userId: string, id: string, otp: string): Promise<OtpVerificationResult> {
    const request = await this.emailChangeRepository.findActiveById(id);
    if (request?.userId !== userId || request.stage !== EmailChangeStage.OLD_EMAIL_PENDING) {
      return { success: false };
    }

    const normalizedOtp = otp.trim();
    const expectedHash = hashBearerToken(
      normalizedOtp,
      `email-change-old:${AppConfig.get().JWT_SECRET}`,
    );
    if (!constantTimeTokenHashEquals(expectedHash, request.oldEmailOtpHash)) {
      const updated = await this.emailChangeRepository.recordOldEmailFailure(id);
      if (updated === null) {
        return { success: false };
      }
      const remainingAttempts = EMAIL_CHANGE_OTP_MAX_ATTEMPTS - updated.oldEmailAttempts;
      return {
        success: false,
        remainingAttempts: Math.max(remainingAttempts, 0),
        isCancelled: updated.stage === EmailChangeStage.CANCELLED,
      };
    }

    const now = Date.now();
    if (request.oldEmailOtpExpiresAt.getTime() <= now) {
      return { success: false };
    }

    const rawToken = randomBytes(EMAIL_CHANGE_NEW_EMAIL_TOKEN_BYTES).toString('hex');
    const newEmailTokenHash = hashBearerToken(
      rawToken,
      `email-change-new:${AppConfig.get().JWT_SECRET}`,
    );
    const expiresAt = new Date(Date.now() + EMAIL_CHANGE_NEW_EMAIL_TOKEN_TTL_MS);
    const marked = await this.emailChangeRepository.markOldEmailVerified(
      id,
      newEmailTokenHash,
      expiresAt,
    );
    if (!marked) {
      return { success: false };
    }
    return {
      success: true,
      newEmailToken: rawToken,
      newEmailExpiresAt: expiresAt,
      newEmail: request.newEmail,
    };
  }

  async resendOldEmailOtp(
    userId: string,
    id: string,
  ): Promise<{ request: EmailChangeRequest; rawOtp: string; oldEmail: string }> {
    const request = await this.emailChangeRepository.findActiveById(id);
    if (request?.userId !== userId || request.stage !== EmailChangeStage.OLD_EMAIL_PENDING) {
      throw new BusinessException(
        'Email change request not found',
        'EMAIL_CHANGE_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    const user = await this.usersRepository.findById(userId);
    if (user === null) {
      throw new EntityNotFoundException('User', userId);
    }

    const now = Date.now();
    if (
      request.lastSentAt !== null &&
      now - request.lastSentAt.getTime() < EMAIL_CHANGE_RESEND_COOLDOWN_MS
    ) {
      throw new BusinessException(
        'Please wait before resending the code',
        'EMAIL_CHANGE_RESEND_COOLDOWN',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const rawOtp = generateNumericOtp();
    const oldEmailOtpHash = hashBearerToken(
      rawOtp,
      `email-change-old:${AppConfig.get().JWT_SECRET}`,
    );
    const expiresAt = new Date(now + EMAIL_CHANGE_OTP_TTL_MS);
    const updated = await this.emailChangeRepository.updateOldEmailOtp(
      id,
      oldEmailOtpHash,
      expiresAt,
    );
    if (updated === null) {
      throw new BusinessException(
        'Email change request not found',
        'EMAIL_CHANGE_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
    return { request: updated, rawOtp, oldEmail: user.email };
  }

  async getPendingState(userId: string): Promise<PendingEmailChangeState | null> {
    const request = await this.emailChangeRepository.findActiveByUserId(userId);
    if (request === null) {
      return null;
    }

    let expiresAt: Date;
    if (request.stage === EmailChangeStage.OLD_EMAIL_PENDING) {
      expiresAt = request.oldEmailOtpExpiresAt;
    } else if (request.stage === EmailChangeStage.NEW_EMAIL_PENDING) {
      if (request.newEmailExpiresAt === null) {
        return null;
      }
      expiresAt = request.newEmailExpiresAt;
    } else {
      return null;
    }

    const atIndex = request.newEmail.indexOf('@');
    const localPart = atIndex === -1 ? request.newEmail : request.newEmail.slice(0, atIndex);
    const domain = atIndex === -1 ? '' : request.newEmail.slice(atIndex);
    const maskedNewEmail = localPart.length === 0 ? `***${domain}` : `${localPart[0]}***${domain}`;

    return {
      requestId: request.id,
      stage:
        request.stage === EmailChangeStage.OLD_EMAIL_PENDING
          ? EmailChangeStage.OLD_EMAIL_PENDING
          : EmailChangeStage.NEW_EMAIL_PENDING,
      maskedNewEmail,
      expiresAt,
    };
  }

  async cancel(userId: string, requestId: string): Promise<boolean> {
    const request = await this.emailChangeRepository.findActiveById(requestId);
    if (request === null) {
      return false;
    }
    if (request.userId !== userId) {
      return false;
    }
    return this.emailChangeRepository.cancel(requestId);
  }

  async confirm(rawToken: string): Promise<EmailChangeCompletionResult> {
    const tokenHash = hashBearerToken(rawToken, `email-change-new:${AppConfig.get().JWT_SECRET}`);
    return this.emailChangeRepository.consumeAndApplyEmailChange(tokenHash);
  }
}
