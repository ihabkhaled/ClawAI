import { Injectable, Logger } from '@nestjs/common';

import { BotCheckAction } from '../enums/bot-check-action.enum';
import { BotCheckOutcome } from '../enums/bot-check-outcome.enum';
import { BotCheckReason } from '../enums/bot-check-reason.enum';
import { CaptchaOutcome } from '../enums/captcha-outcome.enum';
import type {
  BotCheckConfigView,
  BotCheckInput,
  BotCheckVerdict,
  PowChallengeView,
} from '../types/bot-check.types';
import type { SecuritySettings } from '../types/security-settings.types';
import { CaptchaVerificationService } from './captcha-verification.service';
import { ProofOfWorkService } from './proof-of-work.service';
import { SecuritySettingsService } from './security-settings.service';

/**
 * The three layered bot checks (owner decision 2026-11-27): proof of work,
 * always; Cloudflare Turnstile and Google reCAPTCHA v3, each only once an
 * operator has configured both of its keys.
 *
 * Order: every REQUIRED check must be present before any is verified (so the
 * client learns everything it has to send in one 428), then proof of work (cheap,
 * local), then the providers in parallel. A provider that cannot be reached is
 * allowed through, because the proof of work already passed, and logged.
 */
@Injectable()
export class BotCheckService {
  private readonly logger = new Logger(BotCheckService.name);

  constructor(
    private readonly settings: SecuritySettingsService,
    private readonly pow: ProofOfWorkService,
    private readonly captcha: CaptchaVerificationService,
  ) {}

  async getConfig(action: BotCheckAction = BotCheckAction.REGISTER): Promise<BotCheckConfigView> {
    const settings = await this.settings.resolve();
    this.logger.debug(`getConfig: action=${action}`);
    return {
      pow: { enabled: true, difficulty: settings.powDifficulty },
      turnstile: settings.turnstile === null ? null : { siteKey: settings.turnstile.siteKey },
      recaptcha:
        settings.recaptcha === null ? null : { siteKey: settings.recaptcha.siteKey, action },
    };
  }

  async issueChallenge(): Promise<PowChallengeView> {
    const settings = await this.settings.resolve();
    return this.pow.issue(settings.powDifficulty);
  }

  async evaluate(
    input: BotCheckInput | undefined,
    action: BotCheckAction,
    remoteIp: string | null,
  ): Promise<BotCheckVerdict> {
    const settings = await this.settings.resolve();
    if (input?.pow === undefined) {
      return this.verdict(BotCheckOutcome.REQUIRED, BotCheckReason.POW_MISSING);
    }
    if (settings.turnstile !== null && input.turnstileToken === undefined) {
      return this.verdict(BotCheckOutcome.REQUIRED, BotCheckReason.TURNSTILE_MISSING);
    }
    if (settings.recaptcha !== null && input.recaptchaToken === undefined) {
      return this.verdict(BotCheckOutcome.REQUIRED, BotCheckReason.RECAPTCHA_MISSING);
    }
    const powReason = await this.pow.verify(input.pow, settings.powDifficulty);
    return powReason === BotCheckReason.PASSED
      ? this.verifyProviders(input, settings, action, remoteIp)
      : this.verdict(BotCheckOutcome.FAILED, powReason);
  }

  private async verifyProviders(
    input: BotCheckInput,
    settings: SecuritySettings,
    action: BotCheckAction,
    remoteIp: string | null,
  ): Promise<BotCheckVerdict> {
    const [turnstile, recaptcha] = await Promise.all([
      this.turnstileOutcome(input, settings, remoteIp),
      this.recaptchaOutcome(input, settings, action, remoteIp),
    ]);
    if (turnstile === CaptchaOutcome.REJECTED) {
      return this.verdict(BotCheckOutcome.FAILED, BotCheckReason.TURNSTILE_REJECTED);
    }
    if (recaptcha === CaptchaOutcome.REJECTED) {
      return this.verdict(BotCheckOutcome.FAILED, BotCheckReason.RECAPTCHA_REJECTED);
    }
    if (turnstile === CaptchaOutcome.UNREACHABLE || recaptcha === CaptchaOutcome.UNREACHABLE) {
      this.logger.warn(
        `evaluate: a captcha provider was unreachable (turnstile=${turnstile} recaptcha=${recaptcha}); proof of work passed, allowing`,
      );
    }
    return this.verdict(BotCheckOutcome.PASSED, BotCheckReason.PASSED);
  }

  private async turnstileOutcome(
    input: BotCheckInput,
    settings: SecuritySettings,
    remoteIp: string | null,
  ): Promise<CaptchaOutcome> {
    return settings.turnstile === null || input.turnstileToken === undefined
      ? CaptchaOutcome.PASSED
      : this.captcha.verifyTurnstile(settings.turnstile, input.turnstileToken, remoteIp);
  }

  private async recaptchaOutcome(
    input: BotCheckInput,
    settings: SecuritySettings,
    action: BotCheckAction,
    remoteIp: string | null,
  ): Promise<CaptchaOutcome> {
    return settings.recaptcha === null || input.recaptchaToken === undefined
      ? CaptchaOutcome.PASSED
      : this.captcha.verifyRecaptcha(settings.recaptcha, input.recaptchaToken, remoteIp, {
          action,
          minScore: settings.recaptchaMinScore,
        });
  }

  private verdict(outcome: BotCheckOutcome, reason: BotCheckReason): BotCheckVerdict {
    return { outcome, reason };
  }
}
