import { DeviceTokenClass, MobileDeviceScope } from '@claw/shared-types';
import type { Device } from '../../generated/prisma';
import type { AgentScope } from '../types/auth.types';
import type { DevicePublic } from '../../modules/agent/types/agent.types';

/** `null` for anything the table should not hold, so the caller can refuse rather than guess. */
export function parseDeviceTokenClass(value: string): DeviceTokenClass | null {
  const known = Object.values(DeviceTokenClass).find((candidate) => candidate === value);
  return known ?? null;
}

export function isMobileScope(scope: string): scope is MobileDeviceScope {
  return (Object.values(MobileDeviceScope) as string[]).includes(scope);
}

export function parseScopesCsv(scopesCsv: string): AgentScope[] {
  return scopesCsv.split(',').filter((s) => s.length > 0) as AgentScope[];
}

/**
 * True when `scopes` is a legal list for `tokenClass`: a mobile token carries
 * mobile scopes only, and a desktop token carries none of them.
 */
export function scopesFitTokenClass(
  scopes: readonly string[],
  tokenClass: DeviceTokenClass,
): boolean {
  if (scopes.length === 0) return false;
  const mobileOnly = scopes.every((scope) => isMobileScope(scope));
  const anyMobile = scopes.some((scope) => isMobileScope(scope));
  return tokenClass === DeviceTokenClass.MOBILE ? mobileOnly : !anyMobile;
}

export function devicePublic(device: Device): DevicePublic {
  return {
    id: device.id,
    userId: device.userId,
    orgId: device.orgId,
    name: device.name,
    hostname: device.hostname,
    os: device.os,
    platform: device.platform,
    agentVersion: device.agentVersion,
    scopes: parseScopesCsv(device.scopesCsv),
    tokenClass: parseDeviceTokenClass(device.tokenClass) ?? DeviceTokenClass.MOBILE,
    status: device.status,
    lastSeenAt: device.lastSeenAt,
    lastIp: device.lastIp,
    revokedAt: device.revokedAt,
    revokeReason: device.revokeReason,
    metadata: device.metadata,
    createdAt: device.createdAt,
    updatedAt: device.updatedAt,
  };
}
