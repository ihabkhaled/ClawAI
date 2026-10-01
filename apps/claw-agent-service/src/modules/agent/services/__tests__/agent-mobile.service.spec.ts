import { beforeAll, describe, expect, it, vi } from 'vitest';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { DeviceTokenClass, EventPattern, MobileDeviceScope } from '@claw/shared-types';
import { BusinessException } from '../../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../../common/errors/entity-not-found.exception';
import { useAgentTestConfig } from '../../../../common/testing/agent-test-env';
import { AgentCommandRepository } from '../../repositories/agent-command.repository';
import { AgentSessionRepository } from '../../repositories/agent-session.repository';
import { AgentCommandService } from '../agent-command.service';
import { AgentMobileService } from '../agent-mobile.service';
import { CapabilityService } from '../capability.service';
import { CommandRiskService } from '../command-risk.service';
import { CommandStreamService } from '../command-stream.service';
import type { DeviceContext } from '../../../../common/types/auth.types';
import type { TerminalCommand } from '../../../../generated/prisma';

function stub<T extends object>(
  type: abstract new (...args: never[]) => T,
  members: Partial<T>,
): T {
  return Object.assign(Object.create(type.prototype) as T, members);
}

const OWNER: DeviceContext = {
  deviceId: 'device-1',
  userId: 'user-1',
  scopes: [MobileDeviceScope.RUNS_READ, MobileDeviceScope.RUNS_APPROVE],
  jti: 'jti-1',
  orgId: null,
  tokenClass: DeviceTokenClass.MOBILE,
};

function command(userId: string, status = 'PENDING_APPROVAL'): TerminalCommand {
  return { id: 'cmd-1', userId, sessionId: 'session-1', status } as TerminalCommand;
}

/** The REAL command service over a fake repository: the ownership rules under test are the shipped ones. */
function build(row: TerminalCommand | null) {
  const published: Array<{ pattern: string; payload: Record<string, unknown> }> = [];
  const update = vi.fn().mockResolvedValue(row);
  const commandRepo = stub(AgentCommandRepository, {
    findById: vi.fn().mockResolvedValue(row),
    update,
    findAll: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 }),
  });
  const rabbit = stub(RabbitMQService, {
    publish: vi.fn().mockImplementation((pattern: string, payload: Record<string, unknown>) => {
      published.push({ pattern, payload });
      return Promise.resolve();
    }),
  });
  const commands = new AgentCommandService(
    commandRepo,
    stub(AgentSessionRepository, {}),
    rabbit,
    stub(CommandRiskService, {}),
    stub(CommandStreamService, { requestCancel: vi.fn().mockResolvedValue(undefined) }),
  );
  const capabilities = stub(CapabilityService, {
    approve: vi.fn(),
    getById: vi.fn(),
    list: vi.fn(),
  });
  const service = new AgentMobileService(commands, capabilities, rabbit);
  const mobileEvents = () =>
    published.filter((e) => e.pattern === EventPattern.AGENT_MOBILE_ACTION).map((e) => e.payload);
  return { service, commandRepo, update, capabilities, mobileEvents };
}

describe('AgentMobileService ownership and audit (F097)', () => {
  beforeAll(() => useAgentTestConfig());

  it('approves the owner own pending command and audits it as the device', async () => {
    const { service, update, mobileEvents } = build(command('user-1'));
    await service.approveCommand(OWNER, 'cmd-1');
    expect(update).toHaveBeenCalledWith('cmd-1', expect.objectContaining({ status: 'APPROVED' }));
    expect(mobileEvents()).toEqual([
      expect.objectContaining({
        deviceId: 'device-1',
        userId: 'user-1',
        action: 'command.approve',
        targetType: 'command',
        targetId: 'cmd-1',
        outcome: 'success',
      }),
    ]);
  });

  it('cannot approve, reject, cancel or read another user command, and answers 404 like a missing one', async () => {
    for (const act of [
      (s: AgentMobileService) => s.approveCommand(OWNER, 'cmd-1'),
      (s: AgentMobileService) => s.rejectCommand(OWNER, 'cmd-1', {}),
      (s: AgentMobileService) => s.cancelCommand(OWNER, 'cmd-1', {}),
      (s: AgentMobileService) => s.getCommand(OWNER, 'cmd-1'),
    ]) {
      const { service, update } = build(command('someone-else'));
      await expect(act(service)).rejects.toBeInstanceOf(EntityNotFoundException);
      expect(update).not.toHaveBeenCalled();
    }
  });

  it('records a refused cross-user mutation as denied, with the real reason and no payload', async () => {
    const { service, mobileEvents } = build(command('someone-else'));
    await expect(service.approveCommand(OWNER, 'cmd-1')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
    expect(mobileEvents()).toEqual([
      expect.objectContaining({
        action: 'command.approve',
        outcome: 'denied',
        reason: 'FORBIDDEN',
        userId: 'user-1',
      }),
    ]);
  });

  it('answers a missing command the same way', async () => {
    const { service } = build(null);
    await expect(service.getCommand(OWNER, 'cmd-1')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('refuses to approve a command that is not pending', async () => {
    const { service, mobileEvents } = build(command('user-1', 'EXECUTED'));
    await expect(service.approveCommand(OWNER, 'cmd-1')).rejects.toBeInstanceOf(BusinessException);
    expect(mobileEvents()[0]).toMatchObject({ outcome: 'denied', reason: 'ACTION_NOT_PENDING' });
  });

  it('lists only for the device owner, whatever filters the phone sends', async () => {
    const { service, commandRepo } = build(null);
    await service.listCommands(OWNER, { page: 1, pageSize: 20 });
    expect(commandRepo.findAll).toHaveBeenCalledWith({ page: 1, pageSize: 20 }, 'user-1');
  });

  it('runs capability reads and approvals as the device owner', async () => {
    const { service, capabilities } = build(null);
    await service.getCapability(OWNER, 'cap-1');
    await service.listCapabilities(OWNER, { page: 1, pageSize: 20 });
    await service.approveCapability(OWNER, 'cap-1');
    expect(capabilities.getById).toHaveBeenCalledWith('user-1', 'cap-1');
    expect(capabilities.list).toHaveBeenCalledWith('user-1', { page: 1, pageSize: 20 });
    expect(capabilities.approve).toHaveBeenCalledWith('user-1', 'cap-1');
  });

  it('audits a refused capability action as denied', async () => {
    const { service, capabilities, mobileEvents } = build(null);
    vi.mocked(capabilities.approve).mockRejectedValue(
      new EntityNotFoundException('CapabilityInvocation', 'cap-9'),
    );
    await expect(service.approveCapability(OWNER, 'cap-9')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
    expect(mobileEvents()[0]).toMatchObject({
      action: 'capability.approve',
      targetType: 'capability',
      outcome: 'denied',
      reason: 'CAPABILITYINVOCATION_NOT_FOUND',
    });
  });
});
