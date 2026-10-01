import { Logger } from '@nestjs/common';
import { vi } from 'vitest';

import { RunnerPolicyService } from '../runner-policy.service';

import type { OrganizationRepository } from '../../repositories/organization.repository';

function service(listPoliciesForUser: ReturnType<typeof vi.fn>): RunnerPolicyService {
  return new RunnerPolicyService({ listPoliciesForUser } as unknown as OrganizationRepository);
}

const enforcing = {
  minRunnerVersion: '1.90.0',
  allowedRunnerPlatforms: null,
  runnerPolicyMode: 'enforce',
  requireVersionReport: false,
};

describe('RunnerPolicyService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reads the policies of the runner owner only', async () => {
    const list = vi.fn().mockResolvedValue([]);
    await service(list).evaluate('owner-1', { agentVersion: '1.0.0' });
    expect(list).toHaveBeenCalledWith('owner-1');
  });

  it('leaves a user with no organization alone', async () => {
    await expect(service(vi.fn().mockResolvedValue([])).evaluate('u', {})).resolves.toMatchObject({
      evaluated: true,
      status: null,
      refuse: false,
    });
  });

  it('refuses a stale runner under an enforcing organization', async () => {
    const decision = await service(vi.fn().mockResolvedValue([enforcing])).evaluate('u', {
      agentVersion: '1.0.0',
    });
    expect(decision).toMatchObject({ status: 'noncompliant', refuse: true });
  });

  it('is off by default: a row from before the migration constrains nothing', async () => {
    const legacy = { allowedTools: [], runnerPolicyMode: 'off', minRunnerVersion: '9.0.0' };
    const decision = await service(vi.fn().mockResolvedValue([legacy])).evaluate('u', {
      agentVersion: '1.0.0',
    });
    expect(decision).toMatchObject({ status: null, refuse: false });
  });

  it('fails open when the lookup throws: no verdict, never a refusal', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const decision = await service(vi.fn().mockRejectedValue(new Error('db down'))).evaluate('u', {
      agentVersion: '1.0.0',
    });
    expect(decision).toEqual({ evaluated: false, status: null, reason: null, refuse: false });
  });

  it('fails open on a malformed row instead of throwing', async () => {
    const malformed = {
      minRunnerVersion: {},
      allowedRunnerPlatforms: 5,
      runnerPolicyMode: 'enforce',
    };
    const decision = await service(vi.fn().mockResolvedValue([malformed])).evaluate('u', {
      agentVersion: '0.0.1',
    });
    expect(decision.refuse).toBe(false);
  });
});
