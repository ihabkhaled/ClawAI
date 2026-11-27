import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { BusinessException } from '../../../common/errors';
import {
  SECURITY_SETTING_PREFIX,
  SYSTEM_SETTING_CACHE_TTL_MS,
  SYSTEM_SETTING_FALSE,
  SYSTEM_SETTING_TRUE,
  SYSTEM_SETTING_VALUE_REQUIRED_CODE,
  SYSTEM_SETTING_VALUE_REQUIRED_MESSAGE,
} from '../constants/system-setting.constants';
import { SystemSettingRepository } from '../repositories/system-setting.repository';
import { type CachedSystemSetting, type SystemSettingView } from '../types/system-setting.types';
import { toSystemSettingView } from '../utilities/system-setting-view.utility';

/**
 * Cached read/write access to platform settings.
 *
 * The cache is per-process and deliberately in-memory rather than in Redis: the
 * value is a handful of bytes read on the hot reservation path, and putting it
 * in Redis would add a network hop to a call whose whole purpose is to be
 * cheaper than the database read it replaces. Every replica converges within
 * SYSTEM_SETTING_CACHE_TTL_MS of a change, and a write busts the local entry
 * immediately so the admin who flipped it sees the effect at once.
 *
 * Every admin-facing read (list, find, the reply to set) goes through
 * toSystemSettingView, which masks the write-only `security.*.secretKey`
 * values. get() and isEnabled() are in-process reads and return the stored value.
 */
@Injectable()
export class SystemSettingService {
  private readonly logger = new Logger(SystemSettingService.name);
  private readonly cache = new Map<string, CachedSystemSetting>();

  constructor(private readonly repository: SystemSettingRepository) {}

  /**
   * Reads a boolean setting, treating an ABSENT row as `fallback`.
   *
   * Every caller of the PAYG switch passes `false`, so a fresh install meters
   * nothing until an operator turns it on deliberately. That default is not a
   * detail: both docker entrypoints swallow a seed failure, so a green log is
   * not evidence the allowance seeders ran, and metering against unseeded
   * wallets would refuse every paid request on day one.
   */
  async isEnabled(key: string, fallback: boolean): Promise<boolean> {
    const raw = await this.readCached(key);
    return raw === null ? fallback : raw.trim().toLowerCase() === SYSTEM_SETTING_TRUE;
  }

  async get(key: string): Promise<string | null> {
    return this.readCached(key);
  }

  async list(): Promise<SystemSettingView[]> {
    this.logger.debug('list: reading every setting');
    const rows = await this.repository.listAll();
    return rows.map((row) => toSystemSettingView(row));
  }

  async find(key: string): Promise<SystemSettingView | null> {
    this.logger.debug(`find: key=${key}`);
    const row = await this.repository.findByKey(key);
    return row === null ? null : toSystemSettingView(row);
  }

  /** An empty value clears a `security.*` setting; for any other key it is refused (400). */
  async set(key: string, value: string): Promise<SystemSettingView> {
    this.logger.log(`set: writing setting key=${key}`);
    if (value.trim().length === 0 && !key.startsWith(SECURITY_SETTING_PREFIX)) {
      throw new BusinessException(
        SYSTEM_SETTING_VALUE_REQUIRED_MESSAGE,
        SYSTEM_SETTING_VALUE_REQUIRED_CODE,
        HttpStatus.BAD_REQUEST,
      );
    }
    const row = await this.repository.upsert(key, value);
    this.cache.delete(key);
    return toSystemSettingView(row);
  }

  /** Normalizes a boolean to the exact text form {@link isEnabled} recognises. */
  static toStoredBoolean(value: boolean): string {
    return value ? SYSTEM_SETTING_TRUE : SYSTEM_SETTING_FALSE;
  }

  private async readCached(key: string): Promise<string | null> {
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }
    const row = await this.repository.findByKey(key);
    const value = row?.value ?? null;
    this.cache.set(key, { value, expiresAt: now + SYSTEM_SETTING_CACHE_TTL_MS });
    return value;
  }
}
