import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useModelMediaCapabilities } from '@/hooks/chat/use-model-media-capabilities';
import type { ConnectorModel } from '@/types';

const models: ConnectorModel[] = [
  {
    id: '1',
    connectorId: 'c1',
    provider: 'OPENAI',
    modelKey: 'gpt-audio',
    displayName: 'GPT Audio',
    lifecycle: 'ACTIVE',
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsAudio: true,
    maxContextTokens: 128000,
    syncedAt: '2026-09-22T00:00:00.000Z',
  } as unknown as ConnectorModel,
  {
    id: '2',
    connectorId: 'c1',
    provider: 'OPENAI',
    modelKey: 'gpt-text',
    displayName: 'GPT Text',
    lifecycle: 'ACTIVE',
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsAudio: false,
    maxContextTokens: 128000,
    syncedAt: '2026-09-22T00:00:00.000Z',
  } as unknown as ConnectorModel,
];

vi.mock('@/hooks/chat/use-available-connector-models', () => ({
  useAvailableConnectorModels: () => ({ models, isLoading: false }),
}));

describe('useModelMediaCapabilities', () => {
  it('reads both flags off the catalog row', () => {
    const { result } = renderHook(() =>
      useModelMediaCapabilities({
        provider: 'OPENAI',
        model: 'gpt-audio',
        displayName: 'GPT Audio',
      }),
    );
    expect(result.current).toEqual({ canSendAudio: true, canSendVideo: true });
  });

  it('reports a text-only model as unable to take audio or video', () => {
    const { result } = renderHook(() =>
      useModelMediaCapabilities({
        provider: 'OPENAI',
        model: 'gpt-text',
        displayName: 'GPT Text',
      }),
    );
    expect(result.current).toEqual({ canSendAudio: false, canSendVideo: false });
  });

  it('defaults to ENABLED when no model is selected', () => {
    const { result } = renderHook(() => useModelMediaCapabilities(null));
    expect(result.current).toEqual({ canSendAudio: true, canSendVideo: true });
  });

  it('defaults to ENABLED for a model outside the connector catalog (local models)', () => {
    const { result } = renderHook(() =>
      useModelMediaCapabilities({
        provider: 'local-ollama',
        model: 'qwen3:1.7b',
        displayName: 'qwen3',
      }),
    );
    expect(result.current).toEqual({ canSendAudio: true, canSendVideo: true });
  });
});
