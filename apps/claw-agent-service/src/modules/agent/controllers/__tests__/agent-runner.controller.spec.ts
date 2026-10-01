import { describe, expect, it, vi } from 'vitest';
import { AgentRunnerController } from '../agent-runner.controller';
import { RunnerTokenGuard } from '../../../../common/guards/runner-token.guard';
import type { RunnerService } from '../../services/runner.service';
import type { RunnerCredentialService } from '../../services/runner-credential.service';
import type { AgentAuthContext } from '../../../../common/types/auth.types';

function build() {
  const runners = {
    heartbeat: vi.fn().mockResolvedValue({ ok: true, nextHeartbeatInSeconds: 60 }),
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
