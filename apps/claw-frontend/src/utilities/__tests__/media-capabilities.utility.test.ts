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

describe('getConnectorModelCapabilityBadges — video output', () => {
  it.each([
    [ConnectorProvider.GEMINI, 'models/veo-3.1-generate-preview'],
    [ConnectorProvider.GROK, 'grok-imagine-video'],
  ])('badges %s / %s as a video-output model', (provider, modelKey) => {
    expect(
      getConnectorModelCapabilityBadges({
        supportsVision: false,
        supportsAudio: false,
        provider,
        modelKey,
      }),
    ).toEqual([ModelCapabilityBadge.VideoOutput]);
  });

  it('gives an ordinary chat model of the same provider no video badge', () => {
    expect(
      getConnectorModelCapabilityBadges({
        supportsVision: true,
        supportsAudio: false,
        provider: ConnectorProvider.GEMINI,
        modelKey: 'gemini-2.5-pro',
      }),
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

describe('getConnectorModelCapabilityBadges — image output', () => {
  it.each([
    ['GEMINI', 'models/gemini-3-pro-image-preview'],
    ['GEMINI', 'nano-banana-pro-preview'],
    ['OPENAI', 'chatgpt-image-latest'],
    ['GROK', 'grok-imagine-image-quality'],
  ])('badges %s %s as an image-output model', (provider, modelKey) => {
    expect(
      getConnectorModelCapabilityBadges({ supportsVision: false, provider, modelKey } as never),
    ).toContain(ModelCapabilityBadge.ImageOutput);
  });

  it('does not badge a chat model', () => {
    expect(
      getConnectorModelCapabilityBadges({
        supportsVision: true,
        provider: 'GEMINI',
        modelKey: 'gemini-2.5-pro',
      } as never),
    ).not.toContain(ModelCapabilityBadge.ImageOutput);
  });
});

describe('audio output badge and kind typing', () => {
  it.each(['gpt-4o-mini-tts', 'gemini-2.5-pro-preview-tts', 'lyria-3.5'])(
    'badges %s as audio output',
    (modelKey) => {
      expect(
        getConnectorModelCapabilityBadges({
          supportsVision: false,
          provider: 'GEMINI',
          modelKey,
        } as never),
      ).toContain(ModelCapabilityBadge.AudioOutput);
    },
  );
});

describe('mediaKind from connector-service', () => {
  it('badges by the wire mediaKind even for an id the patterns do not know', () => {
    expect(
      getConnectorModelCapabilityBadges({ supportsVision: false, mediaKind: 'AUDIO' } as never),
    ).toEqual([ModelCapabilityBadge.AudioOutput]);
  });
});

describe('audio-output models never show Vision', () => {
  it.each(['gpt-4o-mini-tts-2025-12-15', 'gemini-2.5-pro-preview-tts', 'lyria-3.5'])(
    '%s',
    (modelKey) => {
      expect(
        getConnectorModelCapabilityBadges({
          supportsVision: true,
          supportsAudio: true,
          supportsVideoInput: true,
          modelKey,
          provider: 'GEMINI',
        } as never),
      ).toEqual([ModelCapabilityBadge.AudioInput, ModelCapabilityBadge.AudioOutput]);
    },
  );
});
