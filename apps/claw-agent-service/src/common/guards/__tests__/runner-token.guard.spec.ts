import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { RunnerTokenGuard } from '../runner-token.guard';
import { RunnerCredentialRepository } from '../../../modules/agent/repositories/runner-credential.repository';
import { hashRunnerToken, issueRunnerToken } from '../../utilities/runner-token.utility';
import type { AgentRequest } from '../../types/auth.types';

function stub<T extends object>(
  type: abstract new (...args: never[]) => T,
  members: Partial<T>,
): T {
  return Object.assign(Object.create(type.prototype) as T, members);
}

function requestWith(authorization: string | undefined): AgentRequest {
  const request = new IncomingMessage(new Socket());
  if (authorization !== undefined) request.headers.authorization = authorization;
  return request;
}

function guardFinding(identity: { sessionId: string; userId: string } | null): {
  guard: RunnerTokenGuard;
  find: ReturnType<typeof vi.fn>;
} {
  const find = vi.fn().mockResolvedValue(identity);
  return {
    guard: new RunnerTokenGuard(stub(RunnerCredentialRepository, { findActiveByHash: find })),
    find,
  };
}

describe('RunnerTokenGuard', () => {
  it('admits a live runner token and binds the runner session', async () => {
    const { token } = issueRunnerToken();
    const request = requestWith(`Bearer ${token}`);
    const { guard, find } = guardFinding({ sessionId: 'runner-1', userId: 'u1' });

    await expect(guard.canActivate(new ExecutionContextHost([request, {}]))).resolves.toBe(true);
    expect(find).toHaveBeenCalledWith(hashRunnerToken(token));
    expect(request.agentSession).toEqual({ sessionId: 'runner-1', userId: 'u1' });
  });

  it('refuses a missing header', async () => {
    const { guard, find } = guardFinding({ sessionId: 'runner-1', userId: 'u1' });
    await expect(
      guard.canActivate(new ExecutionContextHost([requestWith(undefined), {}])),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(find).not.toHaveBeenCalled();
  });

  it('refuses a user JWT or a session key without touching the database', async () => {
    const { guard, find } = guardFinding({ sessionId: 'runner-1', userId: 'u1' });
    for (const credential of ['eyJhbGciOiJIUzI1NiJ9.e30.sig', 'a'.repeat(64), 'clwr_']) {
      await expect(
        guard.canActivate(new ExecutionContextHost([requestWith(`Bearer ${credential}`), {}])),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
    expect(find).not.toHaveBeenCalled();
  });

  it('refuses a revoked or unknown runner token', async () => {
    const { token } = issueRunnerToken();
    const request = requestWith(`Bearer ${token}`);
    const { guard } = guardFinding(null);
    await expect(guard.canActivate(new ExecutionContextHost([request, {}]))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.agentSession).toBeUndefined();
  });
});
