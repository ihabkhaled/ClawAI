import { Injectable } from '@nestjs/common';

import { parseBoundedInteger } from '../../anti-abuse/utilities/security-setting-parse.utility';
import { SystemSettingService } from '../../system-settings/services/system-setting.service';
import { SYSTEM_SETTING_TRUE } from '../../system-settings/constants/system-setting.constants';
import {
  ABUSE_SETTING_AUTO_SUSPEND_ENABLED,
  ABUSE_SETTING_ESCALATION_DAYS,
  ABUSE_SETTING_FIRST_SUSPENSION_MINUTES,
  ABUSE_SETTING_FORBIDDEN_PROBES,
  ABUSE_SETTING_RATE_LIMIT_TRIPS,
  ABUSE_SETTING_SECOND_SUSPENSION_MINUTES,
  ABUSE_SETTING_SSRF_REFUSALS,
  ABUSE_SETTING_THIRD_SUSPENSION_MINUTES,
  ABUSE_SETTING_WINDOW_MINUTES,
  DEFAULT_AUTO_SUSPEND_ENABLED,
  DEFAULT_ESCALATION_DAYS,
  DEFAULT_FIRST_SUSPENSION_MINUTES,
  DEFAULT_FORBIDDEN_PROBES,
  DEFAULT_RATE_LIMIT_TRIPS,
  DEFAULT_SECOND_SUSPENSION_MINUTES,
  DEFAULT_SSRF_REFUSALS,
  DEFAULT_THIRD_SUSPENSION_MINUTES,
  DEFAULT_WINDOW_MINUTES,
  ESCALATION_DAYS_MAX,
  ESCALATION_DAYS_MIN,
  SUSPENSION_MINUTES_MAX,
  SUSPENSION_MINUTES_MIN,
  THRESHOLD_MAX,
  THRESHOLD_MIN,
  WINDOW_MINUTES_MAX,
  WINDOW_MINUTES_MIN,
} from '../constants/abuse-defense.constants';
import { AbuseSignalCode } from '../enums/abuse-signal-code.enum';
import type { AbuseSettings, AbuseThresholds } from '../types/abuse-defense.types';

/**
 * Every abuse knob in one read (ADR-233). Values live in the SystemSetting store (the admin
 * system-settings API edits them; the process caches each for 15 s, so a change reaches every
 * replica within seconds). Absent, empty, unparseable or out-of-range reads as the conservative
 * default, so a typo can never switch a threshold to something that suspends normal users.
 */
@Injectable()
export class AbuseSettingsService {
  constructor(private readonly settings: SystemSettingService) {}

  async resolve(): Promise<AbuseSettings> {
    const [enabled, windowMinutes, thresholds, suspensionMinutes, escalationDays] =
      await Promise.all([
        this.settings.get(ABUSE_SETTING_AUTO_SUSPEND_ENABLED),
        this.settings.get(ABUSE_SETTING_WINDOW_MINUTES),
        this.thresholds(),
        this.durations(),
        this.settings.get(ABUSE_SETTING_ESCALATION_DAYS),
      ]);
    return {
      enabled: this.flag(enabled, DEFAULT_AUTO_SUSPEND_ENABLED),
      windowMinutes: parseBoundedInteger(
        windowMinutes,
        WINDOW_MINUTES_MIN,
        WINDOW_MINUTES_MAX,
        DEFAULT_WINDOW_MINUTES,
      ),
      thresholds,
      suspensionMinutes,
      escalationDays: parseBoundedInteger(
        escalationDays,
        ESCALATION_DAYS_MIN,
        ESCALATION_DAYS_MAX,
        DEFAULT_ESCALATION_DAYS,
      ),
    };
  }

  private async thresholds(): Promise<AbuseThresholds> {
    const [trips, probes, ssrf] = await Promise.all([
      this.settings.get(ABUSE_SETTING_RATE_LIMIT_TRIPS),
      this.settings.get(ABUSE_SETTING_FORBIDDEN_PROBES),
      this.settings.get(ABUSE_SETTING_SSRF_REFUSALS),
    ]);
    return {
      [AbuseSignalCode.RATE_LIMIT_TRIPPED]: this.threshold(trips, DEFAULT_RATE_LIMIT_TRIPS),
      [AbuseSignalCode.FORBIDDEN_PROBE]: this.threshold(probes, DEFAULT_FORBIDDEN_PROBES),
      [AbuseSignalCode.SSRF_REFUSED]: this.threshold(ssrf, DEFAULT_SSRF_REFUSALS),
    };
  }

  private async durations(): Promise<AbuseSettings['suspensionMinutes']> {
    const [first, second, third] = await Promise.all([
      this.settings.get(ABUSE_SETTING_FIRST_SUSPENSION_MINUTES),
      this.settings.get(ABUSE_SETTING_SECOND_SUSPENSION_MINUTES),
      this.settings.get(ABUSE_SETTING_THIRD_SUSPENSION_MINUTES),
    ]);
    return [
      this.minutes(first, DEFAULT_FIRST_SUSPENSION_MINUTES),
      this.minutes(second, DEFAULT_SECOND_SUSPENSION_MINUTES),
      this.minutes(third, DEFAULT_THIRD_SUSPENSION_MINUTES),
    ];
  }

  /** An empty or absent value is the default (a cleared `security.*` setting stores ''), never "false". */
  private flag(raw: string | null, fallback: boolean): boolean {
    const trimmed = raw?.trim().toLowerCase() ?? '';
    return trimmed.length === 0 ? fallback : trimmed === SYSTEM_SETTING_TRUE;
  }

  private threshold(raw: string | null, fallback: number): number {
    return parseBoundedInteger(raw, THRESHOLD_MIN, THRESHOLD_MAX, fallback);
  }

  private minutes(raw: string | null, fallback: number): number {
    return parseBoundedInteger(raw, SUSPENSION_MINUTES_MIN, SUSPENSION_MINUTES_MAX, fallback);
  }
}
