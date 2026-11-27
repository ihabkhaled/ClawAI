import { GUARDS_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '@claw/shared-auth';

import { ServiceTokenGuard } from '../../../../common/guards/service-token.guard';
import { AgentTerminalInternalController } from '../agent-terminal-internal.controller';

describe('AgentTerminalInternalController (security audit 2026-11-27)', () => {
  it('requires the service token on every route: seed-command queues a command for any userId', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AgentTerminalInternalController,
    ) as unknown[];

    expect(guards).toContain(ServiceTokenGuard);
  });

  it('keeps @Public() so the user-JWT guard does not refuse the service caller', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, AgentTerminalInternalController.prototype.seedCommand),
    ).toBe(true);
  });
});
