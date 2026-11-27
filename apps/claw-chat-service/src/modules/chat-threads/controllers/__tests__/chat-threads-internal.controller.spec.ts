import { GUARDS_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '@claw/shared-auth';

import { ServiceTokenGuard } from '../../../../app/guards/service-token.guard';
import { ChatThreadsInternalController } from '../chat-threads-internal.controller';

describe('ChatThreadsInternalController (security audit 2026-11-27)', () => {
  it('requires the service token on every route: threads/seeded writes for any userId', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ChatThreadsInternalController) as unknown[];

    expect(guards).toContain(ServiceTokenGuard);
  });

  it('keeps @Public() so the user-JWT guard does not refuse the service caller', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, ChatThreadsInternalController.prototype.seedThread),
    ).toBe(true);
  });
});
