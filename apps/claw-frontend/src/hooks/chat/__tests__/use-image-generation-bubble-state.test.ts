import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useImageGenerationBubbleState } from '@/hooks/chat/use-image-generation-bubble-state';
import type { ImageGeneration } from '@/types/image-generation.types';

const { mockListener, mockRetry, mockRetryAlternate } = vi.hoisted(() => ({
  mockListener: vi.fn(),
  mockRetry: vi.fn(),
  mockRetryAlternate: vi.fn(),
}));

vi.mock('@/hooks/chat/use-image-generation-listener', () => ({
  useImageGenerationListener: (id: string, token: number) => mockListener(id, token),
}));

vi.mock('@/repositories/image-generation/image-generation.repository', () => ({
  imageGenerationRepository: { retry: mockRetry, retryAlternate: mockRetryAlternate },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}|${Object.values(params).join('/')}` : key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

const shown = (overrides: Partial<ImageGeneration> = {}): ImageGeneration => ({
  id: 'img-2',
  status: 'GENERATING' as ImageGeneration['status'],
  provider: 'IMAGE_LOCAL_COMFYUI',
  model: 'sd_v1-5',
  prompt: 'a lighthouse',
  assets: [],
  createdAt: '2026-09-25T00:00:00Z',
  updatedAt: '2026-09-25T00:00:00Z',
  ...overrides,
});

describe('useImageGenerationBubbleState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRetry.mockResolvedValue(undefined);
    mockRetryAlternate.mockResolvedValue({ generationId: 'img-5' });
  });

  it('localizes the runtime stage and adds the step count only when the runtime reported it', () => {
    mockListener.mockReturnValue(
      shown({
        runtimeProgress: { stage: 'EXECUTING_NODE' as never, currentStep: 4, totalSteps: 20 },
      }),
    );
    const { result, rerender } = renderHook(() =>
      useImageGenerationBubbleState({ generationId: 'img-1' }),
    );
    expect(result.current.stageText).toBe(
      'chat.imageStage.runningWorkflow · runtimeProgress.image.stepProgress|4/20',
    );

    mockListener.mockReturnValue(shown({ runtimeProgress: { stage: 'MODEL_LOADING' as never } }));
    rerender();
    expect(result.current.stageText).toBe('chat.imageStage.loadingModel');

    mockListener.mockReturnValue(shown({ runtimeProgress: null }));
    rerender();
    expect(result.current.stageText).toBeUndefined();
  });

  it('retries the row the card is SHOWING (the chain head), then re-reads it', async () => {
    mockListener.mockReturnValue(shown({ id: 'img-2' }));
    const { result } = renderHook(() => useImageGenerationBubbleState({ generationId: 'img-1' }));

    act(() => {
      result.current.handleRetry();
    });

    expect(mockRetry).toHaveBeenCalledWith('img-2');
    await waitFor(() => expect(mockListener).toHaveBeenLastCalledWith('img-1', 1));
  });

  it('retries on another model from the chain head and then tracks the new row', async () => {
    mockListener.mockReturnValue(shown({ id: 'img-2' }));
    const { result } = renderHook(() => useImageGenerationBubbleState({ generationId: 'img-1' }));

    act(() => {
      result.current.handleRetryWithModel('IMAGE_OPENAI', 'gpt-image-1');
    });

    expect(mockRetryAlternate).toHaveBeenCalledWith('img-2', 'IMAGE_OPENAI', 'gpt-image-1');
    await waitFor(() => expect(mockListener).toHaveBeenLastCalledWith('img-5', 0));
  });

  it('survives a refused retry (409 on a superseded row) without throwing', async () => {
    mockRetry.mockRejectedValue(new Error('409'));
    mockListener.mockReturnValue(shown());
    const { result } = renderHook(() => useImageGenerationBubbleState({ generationId: 'img-1' }));

    act(() => {
      result.current.handleRetry();
    });

    await waitFor(() => expect(mockRetry).toHaveBeenCalled());
    expect(mockListener).toHaveBeenLastCalledWith('img-1', 0);
  });
});
