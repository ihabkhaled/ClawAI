import { randomInt } from 'node:crypto';
import { EMAIL_CHANGE_OTP_DIGITS } from '../constants/email-change.constants';

export function generateNumericOtp(): string {
  const min = Math.pow(10, EMAIL_CHANGE_OTP_DIGITS - 1);
  const max = Math.pow(10, EMAIL_CHANGE_OTP_DIGITS) - 1;
  return randomInt(min, max + 1).toString();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
