import type { Device } from '../../generated/prisma';
import type { DeviceScope } from '../enums/device-scope.enum';
import type { DevicePublic } from '../../modules/agent/types/agent.types';

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
    scopes: device.scopesCsv.split(',').filter((s) => s.length > 0) as DeviceScope[],
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
