import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { SystemSettingService } from '../../system-settings/services/system-setting.service';
import {
  DEFAULT_POW_DIFFICULTY,
  DEFAULT_RECAPTCHA_MIN_SCORE,
  DEFAULT_SIGNUP_MAX_PER_10_MIN,
  DEFAULT_SIGNUP_MAX_PER_DEVICE_PER_DAY,
  DISPOSABLE_EMAIL_DOMAINS,
  POW_DIFFICULTY_MAX,
  POW_DIFFICULTY_MIN,
  RECAPTCHA_MIN_SCORE_CEILING,
  RECAPTCHA_MIN_SCORE_FLOOR,
  SECURITY_SETTING_EMAIL_ALLOWED_DOMAINS,
  SECURITY_SETTING_EMAIL_BLOCKED_DOMAINS,
  SECURITY_SETTING_POW_DIFFICULTY,
  SECURITY_SETTING_RECAPTCHA_MIN_SCORE,
  SECURITY_SETTING_RECAPTCHA_SECRET_KEY,
  SECURITY_SETTING_RECAPTCHA_SITE_KEY,
  SECURITY_SETTING_SIGNUP_MAX_PER_10_MIN,
  SECURITY_SETTING_SIGNUP_MAX_PER_DEVICE_PER_DAY,
  SECURITY_SETTING_TURNSTILE_SECRET_KEY,
  SECURITY_SETTING_TURNSTILE_SITE_KEY,
  SIGNUP_LIMIT_MAX,
  SIGNUP_LIMIT_MIN,
} from '../constants/anti-abuse.constants';
import type { CaptchaKeys } from '../types/bot-check.types';
import type {
  CaptchaProviderStatus,
  SignupProtectionStatus,
} from '../types/signup-protection.types';
import type {
  SecurityDomainLists,
  SecurityNumberSettings,
  SecuritySettings,
} from '../types/security-settings.types';
import { parseDomainList } from '../utilities/email-domain.utility';
import {
  keySource,
  parseBoundedInteger,
  parseBoundedNumber,
  resolveKey,
  toCaptchaKeys,
} from '../utilities/security-setting-parse.utility';

/**
 * Every anti-abuse knob in one read. Values come from the SystemSetting store
 * (cached per process for SYSTEM_SETTING_CACHE_TTL_MS, so an admin change lands
 * on every replica within seconds and costs no query per sign-up). The four
 * captcha keys fall back to AppConfig env vars; a non-empty stored value wins.
 * An absent, unparseable or out-of-range number reads as its default.
 */
@Injectable()
export class SecuritySettingsService {
  private readonly logger = new Logger(SecuritySettingsService.name);

  constructor(private readonly settings: SystemSettingService) {}

  async resolve(): Promise<SecuritySettings> {
    this.logger.debug('resolve: reading security settings');
    const [turnstile, recaptcha, numbers, lists] = await Promise.all([
      this.captchaKeys(
        SECURITY_SETTING_TURNSTILE_SITE_KEY,
        SECURITY_SETTING_TURNSTILE_SECRET_KEY,
        AppConfig.get().TURNSTILE_SITE_KEY,
        AppConfig.get().TURNSTILE_SECRET_KEY,
      ),
      this.captchaKeys(
        SECURITY_SETTING_RECAPTCHA_SITE_KEY,
        SECURITY_SETTING_RECAPTCHA_SECRET_KEY,
        AppConfig.get().RECAPTCHA_SITE_KEY,
        AppConfig.get().RECAPTCHA_SECRET_KEY,
      ),
      this.numbers(),
      this.domainLists(),
    ]);
    return { turnstile, recaptcha, ...numbers, ...lists };
  }

  /**
   * What the admin page cannot read from the settings rows: whether each captcha provider is on, where its
   * keys come from (a saved setting, or the server environment the rows never show) and the size of the
   * built-in disposable list. Site keys are public; a secret is never returned.
   */
  async status(): Promise<SignupProtectionStatus> {
    const [turnstile, recaptcha] = await Promise.all([
      this.providerStatus(
        SECURITY_SETTING_TURNSTILE_SITE_KEY,
        SECURITY_SETTING_TURNSTILE_SECRET_KEY,
        AppConfig.get().TURNSTILE_SITE_KEY,
        AppConfig.get().TURNSTILE_SECRET_KEY,
      ),
      this.providerStatus(
        SECURITY_SETTING_RECAPTCHA_SITE_KEY,
        SECURITY_SETTING_RECAPTCHA_SECRET_KEY,
        AppConfig.get().RECAPTCHA_SITE_KEY,
        AppConfig.get().RECAPTCHA_SECRET_KEY,
      ),
    ]);
    return { turnstile, recaptcha, builtInDisposableDomainCount: DISPOSABLE_EMAIL_DOMAINS.size };
  }

  private async providerStatus(
    siteSetting: string,
    secretSetting: string,
    siteEnv: string | undefined,
    secretEnv: string | undefined,
  ): Promise<CaptchaProviderStatus> {
    const [site, secret] = await Promise.all([
      this.settings.get(siteSetting),
      this.settings.get(secretSetting),
    ]);
    const siteKey = resolveKey(site, siteEnv);
    return {
      active: toCaptchaKeys(siteKey, resolveKey(secret, secretEnv)) !== null,
      siteKey: siteKey.length > 0 ? siteKey : null,
      siteKeySource: keySource(site, siteEnv),
      secretKeySource: keySource(secret, secretEnv),
    };
  }

  private async captchaKeys(
    siteSetting: string,
    secretSetting: string,
    siteEnv: string | undefined,
    secretEnv: string | undefined,
  ): Promise<CaptchaKeys | null> {
    const [site, secret] = await Promise.all([
      this.settings.get(siteSetting),
      this.settings.get(secretSetting),
    ]);
    return toCaptchaKeys(resolveKey(site, siteEnv), resolveKey(secret, secretEnv));
  }

  private async numbers(): Promise<SecurityNumberSettings> {
    const [minScore, difficulty, per10Min, perDevice] = await Promise.all([
      this.settings.get(SECURITY_SETTING_RECAPTCHA_MIN_SCORE),
      this.settings.get(SECURITY_SETTING_POW_DIFFICULTY),
      this.settings.get(SECURITY_SETTING_SIGNUP_MAX_PER_10_MIN),
      this.settings.get(SECURITY_SETTING_SIGNUP_MAX_PER_DEVICE_PER_DAY),
    ]);
    return {
      recaptchaMinScore: parseBoundedNumber(
        minScore,
        RECAPTCHA_MIN_SCORE_FLOOR,
        RECAPTCHA_MIN_SCORE_CEILING,
        DEFAULT_RECAPTCHA_MIN_SCORE,
      ),
      powDifficulty: parseBoundedInteger(
        difficulty,
        POW_DIFFICULTY_MIN,
        POW_DIFFICULTY_MAX,
        DEFAULT_POW_DIFFICULTY,
      ),
      signupMaxPer10Min: parseBoundedInteger(
        per10Min,
        SIGNUP_LIMIT_MIN,
        SIGNUP_LIMIT_MAX,
        DEFAULT_SIGNUP_MAX_PER_10_MIN,
      ),
      signupMaxPerDevicePerDay: parseBoundedInteger(
        perDevice,
        SIGNUP_LIMIT_MIN,
        SIGNUP_LIMIT_MAX,
        DEFAULT_SIGNUP_MAX_PER_DEVICE_PER_DAY,
      ),
    };
  }

  private async domainLists(): Promise<SecurityDomainLists> {
    const [blocked, allowed] = await Promise.all([
      this.settings.get(SECURITY_SETTING_EMAIL_BLOCKED_DOMAINS),
      this.settings.get(SECURITY_SETTING_EMAIL_ALLOWED_DOMAINS),
    ]);
    return { blockedDomains: parseDomainList(blocked), allowedDomains: parseDomainList(allowed) };
  }
}
