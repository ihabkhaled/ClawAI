import { vi } from 'vitest';
import { EntityNotFoundException } from '../../../../common/errors/entity-not-found.exception';
import { hashRunnerToken } from '../../../../common/utilities/runner-token.utility';
import { RunnerCredentialService } from '../runner-credential.service';
import type { RunnerCredentialRepository } from '../../repositories/runner-credential.repository';
import type { RunnerRepository } from '../../repositories/runner.repository';

function partial<T extends object>(value: Partial<T>): T {
  return value as T;
}

function setup(owned: boolean) {
  const credentials = {
    issue: vi.fn().mockResolvedValue(undefined),
    rotate: vi.fn().mockResolvedValue(undefined),
    revoke: vi.fn().mockResolvedValue(undefined),
  };
  const runners = {
    findOwned: vi.fn().mockResolvedValue(owned ? { id: 'runner-1' } : null),
    disconnect: vi.fn().mockResolvedValue(undefined),
  };
  return {
    service: new RunnerCredentialService(
      partial<RunnerCredentialRepository>(credentials),
      partial<RunnerRepository>(runners),
    ),
    credentials,
    runners,
  };
}

describe('RunnerCredentialService', () => {
  it('issues a token and stores only its digest', async () => {
    const { service, credentials } = setup(true);
    const issued = await service.issue('runner-1', 'user-1');
    expect(credentials.issue).toHaveBeenCalledWith(
      'runner-1',
      'user-1',
      hashRunnerToken(issued.token),
      issued.tokenPrefix,
    );
    expect(JSON.stringify(credentials.issue.mock.calls)).not.toContain(issued.token);
  });

  it('rotates an owned runner: new token returned once, new digest stored', async () => {
    const { service, credentials, runners } = setup(true);
    const rotated = await service.rotate('runner-1', 'user-1');
    expect(runners.findOwned).toHaveBeenCalledWith('runner-1', 'user-1');
    expect(rotated.runnerId).toBe('runner-1');
    expect(rotated.runnerToken.startsWith('clwr_')).toBe(true);
    expect(credentials.rotate).toHaveBeenCalledWith(
      'runner-1',
      'user-1',
      hashRunnerToken(rotated.runnerToken),
      rotated.tokenPrefix,
    );
  });

  it("refuses to rotate another user's runner (404, nothing written)", async () => {
    const { service, credentials } = setup(false);
    await expect(service.rotate('runner-1', 'intruder')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
    expect(credentials.rotate).not.toHaveBeenCalled();
  });

  it('revokes an owned runner and disconnects it so it gets no new job', async () => {
    const { service, credentials, runners } = setup(true);
    await service.revoke('runner-1', 'user-1');
    expect(credentials.revoke).toHaveBeenCalledWith('runner-1');
    expect(runners.disconnect).toHaveBeenCalledWith('runner-1');
  });

  it("refuses to revoke another user's runner (404, nothing written)", async () => {
    const { service, credentials, runners } = setup(false);
    await expect(service.revoke('runner-1', 'intruder')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
    expect(credentials.revoke).not.toHaveBeenCalled();
    expect(runners.disconnect).not.toHaveBeenCalled();
  });
});
