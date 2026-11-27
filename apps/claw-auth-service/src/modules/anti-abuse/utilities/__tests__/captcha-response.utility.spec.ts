import { BotCheckAction } from '../../enums/bot-check-action.enum';
import { CaptchaOutcome } from '../../enums/captcha-outcome.enum';
import { readRecaptchaOutcome, readTurnstileOutcome } from '../captcha-response.utility';

const EXPECT_REGISTER = { action: BotCheckAction.REGISTER, minScore: 0.5 };

describe('captcha response utilities', () => {
  it('Turnstile: success passes, a refusal is REJECTED, garbage is UNREACHABLE', () => {
    expect(readTurnstileOutcome({ success: true, hostname: 'claw.local' })).toBe(
      CaptchaOutcome.PASSED,
    );
    expect(
      readTurnstileOutcome({ success: false, 'error-codes': ['invalid-input-response'] }),
    ).toBe(CaptchaOutcome.REJECTED);
    expect(readTurnstileOutcome('<html>')).toBe(CaptchaOutcome.UNREACHABLE);
    expect(readTurnstileOutcome(null)).toBe(CaptchaOutcome.UNREACHABLE);
  });

  it('reCAPTCHA: passes with success, the right action and a high enough score', () => {
    expect(
      readRecaptchaOutcome({ success: true, action: 'register', score: 0.9 }, EXPECT_REGISTER),
    ).toBe(CaptchaOutcome.PASSED);
    expect(
      readRecaptchaOutcome({ success: true, action: 'register', score: 0.5 }, EXPECT_REGISTER),
    ).toBe(CaptchaOutcome.PASSED);
  });

  it('reCAPTCHA: a low score, a wrong action, no score or a failure is REJECTED', () => {
    expect(
      readRecaptchaOutcome({ success: true, action: 'register', score: 0.1 }, EXPECT_REGISTER),
    ).toBe(CaptchaOutcome.REJECTED);
    expect(
      readRecaptchaOutcome({ success: true, action: 'login', score: 0.9 }, EXPECT_REGISTER),
    ).toBe(CaptchaOutcome.REJECTED);
    expect(readRecaptchaOutcome({ success: true, action: 'register' }, EXPECT_REGISTER)).toBe(
      CaptchaOutcome.REJECTED,
    );
    expect(
      readRecaptchaOutcome(
        { success: false, 'error-codes': ['timeout-or-duplicate'] },
        EXPECT_REGISTER,
      ),
    ).toBe(CaptchaOutcome.REJECTED);
  });

  it('reCAPTCHA: an unreadable answer is UNREACHABLE, not a refusal', () => {
    expect(readRecaptchaOutcome({ score: 1 }, EXPECT_REGISTER)).toBe(CaptchaOutcome.UNREACHABLE);
  });
});
