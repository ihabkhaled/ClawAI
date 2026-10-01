import { describe, expect, it, vi } from 'vitest';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { AuditEventManager } from '../audit-event.manager';
import { AuditsService } from '../../services/audits.service';
import { UsageService } from '../../services/usage.service';

// F097 — the audit trail for the mobile device token class: its pairing and revocation carry the
// class, and every approve / reject / cancel it performs (or is refused) is one row.

function build() {
  const createAuditLog = vi.fn().mockResolvedValue({});
  const subscribe = vi.fn().mockResolvedValue(undefined);
  const manager = new AuditEventManager(
    Object.assign(Object.create(RabbitMQService.prototype) as RabbitMQService, { subscribe }),
    Object.assign(Object.create(AuditsService.prototype) as AuditsService, { createAuditLog }),
    Object.assign(Object.create(UsageService.prototype) as UsageService, {}),
  );
  return { manager, createAuditLog, subscribe };
}

const BASE = { timestamp: '2026-10-01T00:00:00.000Z', deviceId: 'device-1', userId: 'user-1' };

describe('AuditEventManager mobile token events (F097)', () => {
  it('subscribes to the mobile action pattern', async () => {
    const { manager, subscribe } = build();
    await manager.onModuleInit();
    const patterns = subscribe.mock.calls.map((call: unknown[]) => call[0]);
    expect(patterns).toContain(EventPattern.AGENT_MOBILE_ACTION);
  });

  it('writes a MEDIUM row for an approved command, naming the device and the operation', async () => {
    const { manager, createAuditLog } = build();
    await manager.handleAgentMobileAction({
      ...BASE,
      action: 'command.approve',
      targetType: 'command',
      targetId: 'cmd-1',
      outcome: 'success',
    });
    expect(createAuditLog).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'AGENT_MOBILE_ACTION',
      entityType: 'agent_command',
      entityId: 'cmd-1',
      severity: 'MEDIUM',
      details: {
        deviceId: 'device-1',
        operation: 'command.approve',
        outcome: 'success',
        reason: undefined,
      },
    });
  });

  it('writes a HIGH row for a refused capability action, with the refusal reason', async () => {
    const { manager, createAuditLog } = build();
    await manager.handleAgentMobileAction({
      ...BASE,
      action: 'capability.cancel',
      targetType: 'capability',
      targetId: 'cap-1',
      outcome: 'denied',
      reason: 'FORBIDDEN',
    });
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'agent_capability',
        severity: 'HIGH',
        details: expect.objectContaining({ outcome: 'denied', reason: 'FORBIDDEN' }),
      }),
    );
  });

  it('records the credential class on pairing and revocation, defaulting old events to device', async () => {
    const { manager, createAuditLog } = build();
    await manager.handleAgentDevicePaired({
      ...BASE,
      scopes: ['runs:read'],
      hostname: 'iphone',
      tokenClass: 'mobile',
    });
    await manager.handleAgentDevicePaired({ ...BASE, scopes: ['shell:exec'], hostname: 'laptop' });
    await manager.handleAgentDeviceRevoked({
      ...BASE,
      reason: 'user_revoked',
      tokenClass: 'mobile',
    });
    const classes = createAuditLog.mock.calls.map(
      (call: Array<{ details: { tokenClass: string } }>) => call[0]?.details.tokenClass,
    );
    expect(classes).toEqual(['mobile', 'device', 'mobile']);
  });
});
