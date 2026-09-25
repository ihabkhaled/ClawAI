import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectorProvider } from '@/enums';
import { useModelMediaCapabilities } from '@/hooks/chat/use-model-media-capabilities';
import type { ConnectorModel } from '@/types';

// Recorder gating is NOT a property of the selected chat model (batch 10):
// the mic follows transcription availability across the catalog, the camera
// follows the plan's maxVideoSeconds. These tests pin both rules.

function row(overrides: Partial<ConnectorModel>): ConnectorModel {
  return {
    id: 'row',
    connectorId: 'c1',
    provider: ConnectorProvider.ANTHROPIC,
    modelKey: 'claude-sonnet',
    displayName: 'Claude Sonnet',
    lifecycle: 'ACTIVE',
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsAudio: false,
    maxContextTokens: 200_000,
    syncedAt: '2026-09-25T00:00:00.000Z',
    ...overrides,
  };
}

const state = vi.hoisted(() => ({
  models: [] as ConnectorModel[],
  maxVideoSeconds: undefined as number | null | undefined,
  hasEntitlements: true,
}));

vi.mock('@/hooks/chat/use-available-connector-models', () => ({
  useAvailableConnectorModels: () => ({ models: state.models, isLoading: false }),
}));

vi.mock('@/hooks/plans/use-entitlements', () => ({
  useEntitlements: () => ({
    entitlements: state.hasEntitlements
      ? {
          plan: { limits: { maxVideoSeconds: state.maxVideoSeconds } },
        }
      : null,
    isLoading: false,
    isError: false,
    error: null,
    onRetry: vi.fn(),
  }),
}));

const claude = row({});
const geminiAudio = row({
  id: 'g',
  provider: ConnectorProvider.GEMINI,
  modelKey: 'gemini-2.5-flash',
  displayName: 'Gemini 2.5 Flash',
  supportsAudio: true,
});

describe('useModelMediaCapabilities — voice follows transcription, not the chat model', () => {
  beforeEach(() => {
    state.models = [];
    state.maxVideoSeconds = null;
    state.hasEntitlements = true;
  });

  it('keeps the mic ENABLED for Claude when another catalog row can transcribe', () => {
    state.models = [claude, geminiAudio];
    const { result } = renderHook(() => useModelMediaCapabilities());
    expect(result.current.canSendAudio).toBe(true);
  });

  it('dims the mic when the catalog loaded and no row can take audio', () => {
    state.models = [claude];
    const { result } = renderHook(() => useModelMediaCapabilities());
    expect(result.current.canSendAudio).toBe(false);
  });

  it('keeps the mic enabled when the catalog is empty or unavailable (unknown)', () => {
    state.models = [];
    const { result } = renderHook(() => useModelMediaCapabilities());
    expect(result.current.canSendAudio).toBe(true);
  });
});

describe('useModelMediaCapabilities — video follows the plan only', () => {
  beforeEach(() => {
    state.models = [claude];
    state.hasEntitlements = true;
  });

  it('dims the camera when the plan sets maxVideoSeconds to 0', () => {
    state.maxVideoSeconds = 0;
    const { result } = renderHook(() => useModelMediaCapabilities());
    expect(result.current.canSendVideo).toBe(false);
  });

  it.each([null, 60, undefined])(
    'keeps the camera enabled for maxVideoSeconds=%s, even with no vision model',
    (limit) => {
      state.models = [row({ supportsVision: false })];
      state.maxVideoSeconds = limit;
      const { result } = renderHook(() => useModelMediaCapabilities());
      expect(result.current.canSendVideo).toBe(true);
    },
  );

  it('keeps the camera enabled while entitlements are not loaded', () => {
    state.hasEntitlements = false;
    const { result } = renderHook(() => useModelMediaCapabilities());
    expect(result.current.canSendVideo).toBe(true);
  });
});
