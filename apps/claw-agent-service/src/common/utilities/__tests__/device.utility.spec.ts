import { describe, expect, it } from 'vitest';
import { DeviceTokenClass, MobileDeviceScope } from '@claw/shared-types';
import { MOBILE_DEVICE_SCOPE_VALUES, MOBILE_TOKEN_CLASS } from '@claw/shared-constants';
import { pairApproveSchema } from '../../../modules/agent/dto/pair-approve.dto';
import { DeviceScope } from '../../enums/device-scope.enum';
import { isMobileScope, parseDeviceTokenClass, scopesFitTokenClass } from '../device.utility';

describe('mobile token constants agree with the shared enums (F097)', () => {
  it('lists the same scopes in shared-types and shared-constants', () => {
    expect([...Object.values(MobileDeviceScope)].sort()).toEqual(
      [...MOBILE_DEVICE_SCOPE_VALUES].sort(),
    );
    expect(MOBILE_TOKEN_CLASS).toBe(DeviceTokenClass.MOBILE);
  });

  it('keeps the mobile scopes out of the desktop scope enum', () => {
    const desktop = Object.values(DeviceScope) as string[];
    for (const scope of MOBILE_DEVICE_SCOPE_VALUES) expect(desktop).not.toContain(scope);
  });
});

describe('device.utility class helpers', () => {
  it('parses the two classes and nothing else', () => {
    expect(parseDeviceTokenClass('device')).toBe(DeviceTokenClass.DEVICE);
    expect(parseDeviceTokenClass('mobile')).toBe(DeviceTokenClass.MOBILE);
    for (const value of ['', 'MOBILE', 'admin', 'Device ']) {
      expect(parseDeviceTokenClass(value)).toBeNull();
    }
  });

  it('recognises only the three run scopes as mobile scopes', () => {
    expect(isMobileScope('runs:read')).toBe(true);
    expect(isMobileScope('shell:exec')).toBe(false);
    expect(isMobileScope('runs:write')).toBe(false);
  });

  it('fits scopes to a class strictly and refuses an empty list', () => {
    expect(scopesFitTokenClass(['runs:read', 'runs:cancel'], DeviceTokenClass.MOBILE)).toBe(true);
    expect(scopesFitTokenClass(['runs:read', 'fs:read'], DeviceTokenClass.MOBILE)).toBe(false);
    expect(scopesFitTokenClass(['shell:exec'], DeviceTokenClass.DEVICE)).toBe(true);
    expect(scopesFitTokenClass(['shell:exec', 'runs:read'], DeviceTokenClass.DEVICE)).toBe(false);
    expect(scopesFitTokenClass([], DeviceTokenClass.MOBILE)).toBe(false);
    expect(scopesFitTokenClass([], DeviceTokenClass.DEVICE)).toBe(false);
  });
});

describe('pair approve DTO (F097)', () => {
  const code = 'a'.repeat(50);

  it('defaults to the desktop class so existing clients are unchanged', () => {
    const parsed = pairApproveSchema.parse({ pairingCode: code, scopes: ['shell:exec'] });
    expect(parsed.tokenClass).toBe(DeviceTokenClass.DEVICE);
  });

  it('accepts a mobile approval with run scopes only', () => {
    const parsed = pairApproveSchema.parse({
      pairingCode: code,
      scopes: ['runs:read', 'runs:approve'],
      tokenClass: 'mobile',
    });
    expect(parsed.tokenClass).toBe(DeviceTokenClass.MOBILE);
  });

  it('rejects a mobile approval that carries a desktop scope, and a desktop one with a run scope', () => {
    expect(
      pairApproveSchema.safeParse({
        pairingCode: code,
        scopes: ['runs:read', 'shell:exec'],
        tokenClass: 'mobile',
      }).success,
    ).toBe(false);
    expect(pairApproveSchema.safeParse({ pairingCode: code, scopes: ['runs:read'] }).success).toBe(
      false,
    );
  });

  it('rejects an unknown class and an unknown scope', () => {
    expect(
      pairApproveSchema.safeParse({ pairingCode: code, scopes: ['runs:read'], tokenClass: 'root' })
        .success,
    ).toBe(false);
    expect(
      pairApproveSchema.safeParse({
        pairingCode: code,
        scopes: ['runs:delete'],
        tokenClass: 'mobile',
      }).success,
    ).toBe(false);
  });
});
