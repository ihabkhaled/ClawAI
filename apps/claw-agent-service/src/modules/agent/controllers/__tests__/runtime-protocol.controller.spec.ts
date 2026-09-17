import { vi, describe, expect, it } from 'vitest';
import { IS_PUBLIC_KEY } from '@claw/shared-auth';
import { RuntimeProtocolController } from '../runtime-protocol.controller';
import { RuntimeProtocolService } from '../../services/runtime-protocol.service';

describe('RuntimeProtocolController', () => {
  it('delegates the authenticated read-only request to the protocol service', () => {
    const service = new RuntimeProtocolService();
    const descriptor = service.getDescriptor();
    const getDescriptor = vi.spyOn(service, 'getDescriptor');
    const controller = new RuntimeProtocolController(service);

    expect(controller.getProtocol()).toBe(descriptor);
    expect(getDescriptor).toHaveBeenCalledTimes(1);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, RuntimeProtocolController)).not.toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller.getProtocol)).not.toBe(true);
  });
});
