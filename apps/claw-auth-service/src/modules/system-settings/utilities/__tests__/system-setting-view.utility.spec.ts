import {
  systemSettingKeyParamSchema,
  updateSystemSettingSchema,
} from '../../dto/system-setting.dto';
import { isWriteOnlySettingKey, toSystemSettingView } from '../system-setting-view.utility';

const UPDATED = new Date('2026-11-27T10:00:00.000Z');

describe('write-only security settings', () => {
  it.each(['security.turnstile.secretKey', 'security.recaptcha.secretKey'])(
    'treats %s as write-only',
    (key) => {
      expect(isWriteOnlySettingKey(key)).toBe(true);
    },
  );

  it.each(['security.turnstile.siteKey', 'security.pow.difficulty', 'payg.credit.enabled'])(
    'returns %s as is',
    (key) => {
      expect(isWriteOnlySettingKey(key)).toBe(false);
      expect(toSystemSettingView({ id: '1', key, value: 'v', updatedAt: UPDATED })).toEqual({
        key,
        value: 'v',
        updatedAt: UPDATED.toISOString(),
      });
    },
  );

  it('masks a stored secret and says it is configured', () => {
    expect(
      toSystemSettingView({
        id: '1',
        key: 'security.turnstile.secretKey',
        value: '0x4AAAAAAA-secret',
        updatedAt: UPDATED,
      }),
    ).toEqual({
      key: 'security.turnstile.secretKey',
      value: '',
      configured: true,
      updatedAt: UPDATED.toISOString(),
    });
  });

  it('reports a cleared secret as not configured', () => {
    expect(
      toSystemSettingView({
        id: '1',
        key: 'security.recaptcha.secretKey',
        value: '  ',
        updatedAt: UPDATED,
      }),
    ).toMatchObject({ value: '', configured: false });
  });

  it.each([
    'security.turnstile.siteKey',
    'security.turnstile.secretKey',
    'security.recaptcha.minScore',
    'security.signup.maxPer10Min',
    'security.signup.maxPerDevicePerDay',
    'security.email.blockedDomains',
    'payg.credit.enabled',
  ])('accepts the key %s', (key) => {
    expect(systemSettingKeyParamSchema.safeParse({ key }).success).toBe(true);
  });

  it.each(['payg.Credit.enabled', 'Security.x', 'securityX.y', 'security/../x', 'security.a b'])(
    'keeps every key outside security. lowercase, and refuses %s',
    (key) => {
      expect(systemSettingKeyParamSchema.safeParse({ key }).success).toBe(false);
    },
  );

  it('lets the body carry an empty value (the service decides which keys may be cleared)', () => {
    expect(updateSystemSettingSchema.safeParse({ value: '' }).success).toBe(true);
  });
});
