import { describe, expect, it } from '@jest/globals';

import { RuntimeProtocolService } from '../runtime-protocol.service';

describe('RuntimeProtocolService', () => {
  it('returns the immutable 0.18 protocol descriptor without enabling tool execution', () => {
    const service = new RuntimeProtocolService();

    expect(service.getDescriptor()).toEqual({
      versions: ['2.0', '1.0'],
      preferred: '2.0',
      transports: ['sse'],
      features: {
        capabilityManifest: true,
        orderedRunEvents: true,
        toolExecution: false,
      },
      limits: {
        maxEventBytes: 1_048_576,
        maxActiveRuns: 8,
      },
    });
    expect(Object.isFrozen(service.getDescriptor())).toBe(true);
    expect(Object.isFrozen(service.getDescriptor().features)).toBe(true);
  });

  it('returns the same side-effect-free descriptor instance', () => {
    const service = new RuntimeProtocolService();

    expect(service.getDescriptor()).toBe(service.getDescriptor());
  });
});
