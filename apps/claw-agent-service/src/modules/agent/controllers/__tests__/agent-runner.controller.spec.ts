import { describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC_KEY } from '@claw/shared-auth';
import { AgentRunnerController } from '../agent-runner.controller';
import { RunnerTokenGuard } from '../../../../common/guards/runner-token.guard';
import type { RunnerService } from '../../services/runner.service';
import type { RunnerCredentialService } from '../../services/runner-credential.service';
import type { AgentAuthContext, AuthenticatedUser } from '../../../../common/types/auth.types';

function build() {
  const runners = {
    heartbeat: vi.fn().mockResolvedValue({ ok: true, nextHeartbeatInSeconds: 60 }),
    resumeManifest: vi.fn().mockResolvedValue({ online: true }),
  };
  const controller = new AgentRunnerController(
    runners as unknown as RunnerService,
    {} as unknown as RunnerCredentialService,
  );
  return { controller, runners };
}

const context = { sessionId: 'runner-1' } as AgentAuthContext;

describe('AgentRunnerController heartbeat (F100)', () => {
  it('hands the validated report to the service under the calling runner session', async () => {
    const { controller, runners } = build();
    const result = await controller.heartbeat(context, {
      agentVersion: '1.90.0',
      platform: 'linux',
    });
    expect(runners.heartbeat).toHaveBeenCalledWith('runner-1', {
      agentVersion: '1.90.0',
      platform: 'linux',
    });
    expect(result).toEqual({ ok: true, nextHeartbeatInSeconds: 60 });
  });

  it('is guarded by the runner token only', () => {
    const guards: unknown[] = Reflect.getMetadata(
      '__guards__',
      AgentRunnerController.prototype.heartbeat,
    );
    expect(guards).toEqual([RunnerTokenGuard]);
  });
});

describe('AgentRunnerController resume (F095)', () => {
  it('asks for the manifest as the authenticated owner, never a body-supplied one', async () => {
    const { controller, runners } = build();
    const result = await controller.resume({ id: 'user-1' } as AuthenticatedUser, 'runner-1');
    expect(runners.resumeManifest).toHaveBeenCalledWith('runner-1', 'user-1');
    expect(result).toEqual({ online: true });
  });

  it('is an owner route: not public, and no runner-token guard', () => {
    const handler = AgentRunnerController.prototype.resume;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
    expect(Reflect.getMetadata('__guards__', handler)).toBeUndefined();
  });
});
