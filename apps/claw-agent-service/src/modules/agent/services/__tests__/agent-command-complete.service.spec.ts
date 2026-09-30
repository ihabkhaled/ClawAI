import { vi } from 'vitest';
import { BusinessException } from '../../../../common/errors/business.exception';
import { AgentCommandService } from '../agent-command.service';
import type { RabbitMQService } from '@claw/shared-rabbitmq';
import type { AgentCommandRepository } from '../../repositories/agent-command.repository';
import type { AgentSessionRepository } from '../../repositories/agent-session.repository';
import type { CommandRiskService } from '../command-risk.service';
import type { CommandStreamService } from '../command-stream.service';

function partial<T extends object>(value: Partial<T>): T {
  return value as T;
}

function setup(job: { sessionId: string; status: string }) {
  const commandRepo = {
    findById: vi.fn().mockResolvedValue({ id: 'job-1', ...job }),
    update: vi.fn().mockResolvedValue({ id: 'job-1' }),
  };
  const service = new AgentCommandService(
    partial<AgentCommandRepository>(commandRepo),
    partial<AgentSessionRepository>({}),
    partial<RabbitMQService>({ publish: vi.fn().mockResolvedValue(undefined) }),
    partial<CommandRiskService>({}),
    partial<CommandStreamService>({}),
  );
  return { service, commandRepo };
}

describe('AgentCommandService.complete (runner report path)', () => {
  it('refuses a result from a runner the job was not addressed to (403)', async () => {
    const { service, commandRepo } = setup({ sessionId: 'runner-a', status: 'EXECUTING' });
    await expect(service.complete('runner-b', 'job-1', { exitCode: 0 })).rejects.toBeInstanceOf(
      BusinessException,
    );
    expect(commandRepo.update).not.toHaveBeenCalled();
  });

  it('records the result from the runner the job was addressed to', async () => {
    const { service, commandRepo } = setup({ sessionId: 'runner-a', status: 'EXECUTING' });
    await service.complete('runner-a', 'job-1', { exitCode: 0, stdout: 'answer' });
    expect(commandRepo.update).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ status: 'EXECUTED', stdout: 'answer', exitCode: 0 }),
    );
  });
});
