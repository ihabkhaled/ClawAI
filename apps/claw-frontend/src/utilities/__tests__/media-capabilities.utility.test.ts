import { describe, expect, it } from 'vitest';

import { ConnectorProvider } from '@/enums';
import { ModelCapabilityBadge } from '@/enums/model-capability-badge.enum';
import type { ConnectorModel } from '@/types';
import {
  getConnectorModelCapabilityBadges,
  resolveMediaCapabilities,
} from '@/utilities/media-capabilities.utility';

describe('getConnectorModelCapabilityBadges', () => {
  it('derives badges from the row flags only, in display order', () => {
    expect(
      getConnectorModelCapabilityBadges({
        supportsVision: true,
        supportsAudio: true,
        supportsVideoInput: true,
      }),
    ).toEqual([
      ModelCapabilityBadge.Vision,
      ModelCapabilityBadge.AudioInput,
      ModelCapabilityBadge.VideoInput,
    ]);
  });

  it("gives a vision provider's text-only model no Vision badge", () => {
    // Same provider as a vision row — the provider is never consulted.
    expect(
      getConnectorModelCapabilityBadges({ supportsVision: false, supportsAudio: false }),
    ).toEqual([]);
  });

  it('treats an absent video flag (older connector-service) as no badge', () => {
    expect(
      getConnectorModelCapabilityBadges({ supportsVision: true, supportsAudio: false }),
    ).toEqual([ModelCapabilityBadge.Vision]);
  });
});

describe('resolveMediaCapabilities', () => {
  const textOnly = { supportsAudio: false } as const;

  it('video is disabled only by maxVideoSeconds === 0', () => {
    expect(resolveMediaCapabilities([], 0).canSendVideo).toBe(false);
    expect(resolveMediaCapabilities([], null).canSendVideo).toBe(true);
    expect(resolveMediaCapabilities([], 30).canSendVideo).toBe(true);
    expect(resolveMediaCapabilities([], undefined).canSendVideo).toBe(true);
  });

  it('audio needs one transcribing row, or an unknown (empty) catalog', () => {
    expect(resolveMediaCapabilities([], null).canSendAudio).toBe(true);
    expect(
      resolveMediaCapabilities(
        [
          { ...rowStub(), ...textOnly },
          { ...rowStub(), supportsAudio: true },
        ],
        null,
      ).canSendAudio,
    ).toBe(true);
    expect(resolveMediaCapabilities([{ ...rowStub(), ...textOnly }], null).canSendAudio).toBe(
      false,
    );
  });
});

function rowStub(): ConnectorModel {
  return {
    id: 'r',
    connectorId: 'c',
    provider: ConnectorProvider.ANTHROPIC,
    modelKey: 'claude',
    displayName: 'Claude',
    lifecycle: 'ACTIVE',
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsAudio: false,
    maxContextTokens: null,
    syncedAt: '2026-09-25T00:00:00.000Z',
  };
}
