import { Injectable, Logger } from '@nestjs/common';

import { CaptchaHttpAdapter } from '../adapters/captcha-http.adapter';
import { RECAPTCHA_VERIFY_URL, TURNSTILE_VERIFY_URL } from '../constants/anti-abuse.constants';
import { CaptchaOutcome } from '../enums/captcha-outcome.enum';
import type { CaptchaKeys, RecaptchaExpectation } from '../types/bot-check.types';
import { readRecaptchaOutcome, readTurnstileOutcome } from '../utilities/captcha-response.utility';

/**
 * Server-side verification of the two third-party checks. Each runs only when
 * an operator configured both of its keys; the caller decides what UNREACHABLE
 * means (allowed when proof of work passed). The secret goes in the form body
 * and nowhere else.
 */
@Injectable()
export class CaptchaVerificationService {
  private readonly logger = new Logger(CaptchaVerificationService.name);

  constructor(private readonly http: CaptchaHttpAdapter) {}

  async verifyTurnstile(
    keys: CaptchaKeys,
    token: string,
    remoteIp: string | null,
  ): Promise<CaptchaOutcome> {
    const body = await this.http.postForm(TURNSTILE_VERIFY_URL, this.form(keys, token, remoteIp));
    const outcome = body === null ? CaptchaOutcome.UNREACHABLE : readTurnstileOutcome(body);
    this.logger.log(`verifyTurnstile: ${outcome}`);
    return outcome;
  }

  async verifyRecaptcha(
    keys: CaptchaKeys,
    token: string,
    remoteIp: string | null,
    expectation: RecaptchaExpectation,
  ): Promise<CaptchaOutcome> {
    const body = await this.http.postForm(RECAPTCHA_VERIFY_URL, this.form(keys, token, remoteIp));
    const outcome =
      body === null ? CaptchaOutcome.UNREACHABLE : readRecaptchaOutcome(body, expectation);
    this.logger.log(`verifyRecaptcha: ${outcome} action=${expectation.action}`);
    return outcome;
  }

  private form(keys: CaptchaKeys, token: string, remoteIp: string | null): URLSearchParams {
    const form = new URLSearchParams({ secret: keys.secretKey, response: token });
    if (remoteIp !== null) {
      form.set('remoteip', remoteIp);
    }
    return form;
  }
}
