import { GUARDS_METADATA } from '@nestjs/common/constants';

import { ServiceTokenGuard } from '../../../../app/guards/service-token.guard';
import { ChatInternalController } from '../chat-internal.controller';

describe('ChatInternalController', () => {
  it('requires service authentication for provider generation', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ChatInternalController.prototype.generate);

    expect(guards).toContain(ServiceTokenGuard);
  });
});
