import {
  BOT_CHECK_SCRIPT_TIMEOUT_MS,
  RECAPTCHA_EXECUTE_TIMEOUT_MS,
  RECAPTCHA_SCRIPT_ID,
  RECAPTCHA_SCRIPT_URL,
} from '@/constants/bot-check.constants';
import type { BotCheckAction } from '@/enums/bot-check-action.enum';

import { loadExternalScript } from './script-loader';

/**
 * Wrapper around Google reCAPTCHA v3. The only module that touches
 * `window.grecaptcha`. Loading is split from executing because a v3 token
 * expires after two minutes: the script loads when the form opens, the token is
 * minted at submit.
 */
export function loadRecaptcha(siteKey: string): Promise<void> {
  const src = `${RECAPTCHA_SCRIPT_URL}?render=${encodeURIComponent(siteKey)}`;
  return loadExternalScript(RECAPTCHA_SCRIPT_ID, src, BOT_CHECK_SCRIPT_TIMEOUT_MS);
}

export async function executeRecaptcha(siteKey: string, action: BotCheckAction): Promise<string> {
  await loadRecaptcha(siteKey);
  const recaptcha = window.grecaptcha;
  if (recaptcha === undefined) {
    throw new Error('reCAPTCHA did not initialise');
  }
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('reCAPTCHA timed out')),
      RECAPTCHA_EXECUTE_TIMEOUT_MS,
    );
    recaptcha.ready(() => {
      recaptcha.execute(siteKey, { action }).then(
        (token) => {
          clearTimeout(timer);
          resolve(token);
        },
        (error: unknown) => {
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error('reCAPTCHA failed'));
        },
      );
    });
  });
}
