import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { ForbiddenException } from '@nestjs/common';
import { DeviceTokenClass } from '@claw/shared-types';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { CompatAgentGuard } from '../compat-agent.guard';
import { AgentKeyGuard } from '../agent-key.guard';
import { DeviceAccessGuard } from '../device-access.guard';
import { AgentSessionRepository } from '../../../modules/agent/repositories/agent-session.repository';
import type { AgentRequestWithContext } from '../../types/auth.types';

function stub<T extends object>(
  type: abstract new (...args: never[]) => T,
  members: Partial<T>,
): T {
  return Object.assign(Object.create(type.prototype) as T, members);
}

function guardWith(sessionOwner: string | null): {
  guard: CompatAgentGuard;
  legacy: ReturnType<typeof vi.fn>;
} {
  const legacy = vi.fn().mockResolvedValue(true);
  const guard = new CompatAgentGuard(
    stub(DeviceAccessGuard, { canActivate: vi.fn().mockResolvedValue(true) }),
    stub(AgentKeyGuard, { canActivate: legacy }),
    stub(AgentSessionRepository, {
      findById: vi
        .fn()
        .mockResolvedValue(sessionOwner === null ? null : { id: 's1', userId: sessionOwner }),
    }),
  );
  return { guard, legacy };
}

function deviceRequest(
  userId: string,
  where: Pick<AgentRequestWithContext, 'query' | 'body'>,
): AgentRequestWithContext {
  const deviceContext = {
    deviceId: 'd1',
    userId,
    scopes: [],
    jti: 'j1',
    orgId: null,
    tokenClass: DeviceTokenClass.DEVICE,
  };
  return Object.assign(new IncomingMessage(new Socket()), { deviceContext, ...where });
}

describe('CompatAgentGuard device-to-session bridge', () => {
  it('binds the session when the device user owns it', async () => {
    const request = deviceRequest('u1', { query: { sessionId: 's1' } });
    const { guard } = guardWith('u1');

    await expect(guard.canActivate(new ExecutionContextHost([request, {}]))).resolves.toBe(true);
    expect(request.agentSession).toEqual({ sessionId: 's1', userId: 'u1' });
  });

  it('refuses a session owned by another user without falling back to the legacy key', async () => {
    const request = deviceRequest('u1', { query: { sessionId: 's1' } });
    const { guard, legacy } = guardWith('someone-else');

    await expect(guard.canActivate(new ExecutionContextHost([request, {}]))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(request.agentSession).toBeUndefined();
    expect(legacy).not.toHaveBeenCalled();
  });

  it('does not retry a credential the device guard refused as a legacy session key', async () => {
    const legacy = vi.fn().mockResolvedValue(true);
    const refused = new ForbiddenException({ code: 'token_class_denied' });
    const guard = new CompatAgentGuard(
      stub(DeviceAccessGuard, { canActivate: vi.fn().mockRejectedValue(refused) }),
      stub(AgentKeyGuard, { canActivate: legacy }),
      stub(AgentSessionRepository, { findById: vi.fn() }),
    );
    const request = Object.assign(new IncomingMessage(new Socket()), {});

    await expect(guard.canActivate(new ExecutionContextHost([request, {}]))).rejects.toBe(refused);
    expect(legacy).not.toHaveBeenCalled();
  });

  it('answers a missing session exactly like a foreign one', async () => {
    const request = deviceRequest('u1', { body: { sessionId: 'nope' } });
    const { guard } = guardWith(null);

    await expect(guard.canActivate(new ExecutionContextHost([request, {}]))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
