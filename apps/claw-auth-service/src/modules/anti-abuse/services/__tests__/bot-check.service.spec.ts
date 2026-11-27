import { type Mock, vi } from 'vitest';

import { BotCheckAction } from '../../enums/bot-check-action.enum';
import { BotCheckOutcome } from '../../enums/bot-check-outcome.enum';
import { BotCheckReason } from '../../enums/bot-check-reason.enum';
import { CaptchaOutcome } from '../../enums/captcha-outcome.enum';
import type { SecuritySettings } from '../../types/security-settings.types';
import { BotCheckService } from '../bot-check.service';
import { type CaptchaVerificationService } from '../captcha-verification.service';
import { type ProofOfWorkService } from '../proof-of-work.service';
import { type SecuritySettingsService } from '../security-settings.service';

const BASE: SecuritySettings = {
  turnstile: null,
  recaptcha: null,
  recaptchaMinScore: 0.5,
  powDifficulty: 18,
  blockedDomains: [],
  allowedDomains: [],
  signupMaxPer10Min: 30,
  signupMaxPerDevicePerDay: 3,
};
const BOTH: SecuritySettings = {
  ...BASE,
  turnstile: { siteKey: 'ts-site', secretKey: 'ts-secret' },
  recaptcha: { siteKey: 'rc-site', secretKey: 'rc-secret' },
};
const POW = { token: 't.s', nonce: '1' };

describe('BotCheckService', () => {
  let resolve: Mock;
  let powVerify: Mock;
  let verifyTurnstile: Mock;
  let verifyRecaptcha: Mock;
  let service: BotCheckService;

  beforeEach(() => {
    resolve = vi.fn().mockResolvedValue(BASE);
    powVerify = vi.fn().mockResolvedValue(BotCheckReason.PASSED);
    verifyTurnstile = vi.fn().mockResolvedValue(CaptchaOutcome.PASSED);
    verifyRecaptcha = vi.fn().mockResolvedValue(CaptchaOutcome.PASSED);
    service = new BotCheckService(
      { resolve } as unknown as SecuritySettingsService,
      {
        verify: powVerify,
        issue: vi.fn().mockReturnValue({ token: 'x' }),
      } as unknown as ProofOfWorkService,
      { verifyTurnstile, verifyRecaptcha } as unknown as CaptchaVerificationService,
    );
  });

  describe('getConfig', () => {
    it('always offers proof of work and no provider until one is configured', async () => {
      await expect(service.getConfig()).resolves.toEqual({
        pow: { enabled: true, difficulty: 18 },
        turnstile: null,
        recaptcha: null,
      });
    });

    it('shows site keys and the requested action, never a secret', async () => {
      resolve.mockResolvedValue(BOTH);
      const config = await service.getConfig(BotCheckAction.LOGIN);
      expect(config).toEqual({
        pow: { enabled: true, difficulty: 18 },
        turnstile: { siteKey: 'ts-site' },
        recaptcha: { siteKey: 'rc-site', action: 'login' },
      });
      expect(JSON.stringify(config)).not.toMatch(/secret/u);
    });
  });

  it('issues a challenge at the configured difficulty', async () => {
    await service.issueChallenge();
    const pow = (service as unknown as { pow: { issue: Mock } }).pow;
    expect(pow.issue).toHaveBeenCalledWith(18);
  });

  describe('evaluate', () => {
    it('requires proof of work even with no provider configured', async () => {
      await expect(service.evaluate(undefined, BotCheckAction.REGISTER, null)).resolves.toEqual({
        outcome: BotCheckOutcome.REQUIRED,
        reason: BotCheckReason.POW_MISSING,
      });
      await expect(service.evaluate({}, BotCheckAction.REGISTER, null)).resolves.toMatchObject({
        outcome: BotCheckOutcome.REQUIRED,
      });
    });

    it('requires the token of every configured provider before verifying anything', async () => {
      resolve.mockResolvedValue(BOTH);
      await expect(
        service.evaluate({ pow: POW, recaptchaToken: 'r' }, BotCheckAction.REGISTER, null),
      ).resolves.toEqual({
        outcome: BotCheckOutcome.REQUIRED,
        reason: BotCheckReason.TURNSTILE_MISSING,
      });
      await expect(
        service.evaluate({ pow: POW, turnstileToken: 't' }, BotCheckAction.REGISTER, null),
      ).resolves.toEqual({
        outcome: BotCheckOutcome.REQUIRED,
        reason: BotCheckReason.RECAPTCHA_MISSING,
      });
      expect(powVerify).not.toHaveBeenCalled();
    });

    it('fails on a wrong proof of work before calling any provider', async () => {
      resolve.mockResolvedValue(BOTH);
      powVerify.mockResolvedValue(BotCheckReason.POW_EXPIRED);
      await expect(
        service.evaluate(
          { pow: POW, turnstileToken: 't', recaptchaToken: 'r' },
          BotCheckAction.REGISTER,
          null,
        ),
      ).resolves.toEqual({ outcome: BotCheckOutcome.FAILED, reason: BotCheckReason.POW_EXPIRED });
      expect(verifyTurnstile).not.toHaveBeenCalled();
    });

    it('passes on proof of work alone when no provider is configured', async () => {
      await expect(service.evaluate({ pow: POW }, BotCheckAction.REGISTER, null)).resolves.toEqual({
        outcome: BotCheckOutcome.PASSED,
        reason: BotCheckReason.PASSED,
      });
      expect(powVerify).toHaveBeenCalledWith(POW, 18);
    });

    it('verifies both providers with the flow action and the min score', async () => {
      resolve.mockResolvedValue({ ...BOTH, recaptchaMinScore: 0.7 });
      const input = { pow: POW, turnstileToken: 't', recaptchaToken: 'r' };

      await expect(service.evaluate(input, BotCheckAction.LOGIN, '1.2.3.4')).resolves.toMatchObject(
        { outcome: BotCheckOutcome.PASSED },
      );
      expect(verifyTurnstile).toHaveBeenCalledWith(BOTH.turnstile, 't', '1.2.3.4');
      expect(verifyRecaptcha).toHaveBeenCalledWith(BOTH.recaptcha, 'r', '1.2.3.4', {
        action: BotCheckAction.LOGIN,
        minScore: 0.7,
      });
    });

    it.each([
      ['Turnstile', 'turnstile', BotCheckReason.TURNSTILE_REJECTED],
      ['reCAPTCHA', 'recaptcha', BotCheckReason.RECAPTCHA_REJECTED],
    ])('fails when %s rejects the token', async (_name, which, reason) => {
      resolve.mockResolvedValue(BOTH);
      (which === 'turnstile' ? verifyTurnstile : verifyRecaptcha).mockResolvedValue(
        CaptchaOutcome.REJECTED,
      );
      await expect(
        service.evaluate(
          { pow: POW, turnstileToken: 't', recaptchaToken: 'r' },
          BotCheckAction.REGISTER,
          null,
        ),
      ).resolves.toEqual({ outcome: BotCheckOutcome.FAILED, reason });
    });

    it('lets an unreachable provider through once proof of work passed', async () => {
      resolve.mockResolvedValue(BOTH);
      verifyTurnstile.mockResolvedValue(CaptchaOutcome.UNREACHABLE);
      verifyRecaptcha.mockResolvedValue(CaptchaOutcome.UNREACHABLE);
      await expect(
        service.evaluate(
          { pow: POW, turnstileToken: 't', recaptchaToken: 'r' },
          BotCheckAction.REGISTER,
          null,
        ),
      ).resolves.toEqual({ outcome: BotCheckOutcome.PASSED, reason: BotCheckReason.PASSED });
    });
  });
});
