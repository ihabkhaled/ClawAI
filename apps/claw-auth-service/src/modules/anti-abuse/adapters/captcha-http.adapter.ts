import { Injectable, Logger } from '@nestjs/common';

import { assertSafeRequestUrl } from '@claw/shared-utilities';

import {
  CAPTCHA_VERIFY_HOSTS,
  CAPTCHA_VERIFY_TIMEOUT_MS,
  FORM_CONTENT_TYPE,
} from '../constants/anti-abuse.constants';

/**
 * The only place a captcha siteverify call leaves the process.
 *
 * Returns the parsed JSON body, or `null` when there is no usable answer
 * (network error, timeout, redirect, non-2xx, unreadable body); the caller maps
 * `null` to UNREACHABLE. The form carries the provider SECRET, so neither the
 * body nor the error message of a failed call is ever logged: only the status.
 */
@Injectable()
export class CaptchaHttpAdapter {
  private readonly logger = new Logger(CaptchaHttpAdapter.name);

  async postForm(url: string, form: URLSearchParams): Promise<unknown> {
    this.logger.debug(`postForm: verifying a token with ${new URL(url).host}`);
    let response: Response;
    try {
      const target = assertSafeRequestUrl(url, CAPTCHA_VERIFY_HOSTS).href;
      response = await fetch(target, {
        method: 'POST',
        headers: { 'content-type': FORM_CONTENT_TYPE },
        body: form.toString(),
        signal: AbortSignal.timeout(CAPTCHA_VERIFY_TIMEOUT_MS),
        redirect: 'error',
      });
    } catch (error: unknown) {
      this.logger.warn(
        `postForm: ${new URL(url).host} unreachable (${error instanceof Error ? error.name : 'unknown'})`,
      );
      return null;
    }
    return this.readBody(url, response);
  }

  private async readBody(url: string, response: Response): Promise<unknown> {
    if (!response.ok) {
      this.logger.warn(`postForm: ${new URL(url).host} answered HTTP ${response.status}`);
      return null;
    }
    try {
      return (await response.json()) as unknown;
    } catch {
      this.logger.warn(`postForm: ${new URL(url).host} returned an unreadable body`);
      return null;
    }
  }
}
