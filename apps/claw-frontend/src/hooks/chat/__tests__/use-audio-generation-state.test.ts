import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUDIO_GENERATION_MAX_CONSECUTIVE_ERRORS } from '@/constants/audio-generation.constants';
import { AudioGenerationStatus } from '@/enums/audio-generation-status.enum';
import { useAudioGenerationState } from '@/hooks/chat/use-audio-generation-state';
import type { AudioGeneration } from '@/types/media-generation.types';

const { getById, retry } = vi.hoisted(() => ({ getById: vi.fn(), retry: vi.fn() }));
vi.mock('@/repositories/audio-generation/audio-generation.repository', () => ({
  audioGenerationRepository: { getById, retry },
}));

const read = (overrides: Partial<AudioGeneration> = {}): AudioGeneration => ({
  id: 'a1',
  status: AudioGenerationStatus.COMPLETED,
  provider: 'GEMINI',
  model: 'tts',
  kind: 'SPEECH',
  supersededById: null,
  asset: null,
  ...overrides,
});

describe('useAudioGenerationState', () => {
  beforeEach(() => {
    getById.mockReset();
    retry.mockReset();
  });

  it('reads the stored id once and stops on a terminal status (thread reload)', async () => {
    getById.mockResolvedValue(read());
    const { result } = renderHook(() => useAudioGenerationState({ generationId: 'a1' }));
    await waitFor(() => {
      expect(result.current.generation?.status).toBe(AudioGenerationStatus.COMPLETED);
    });
    expect(getById).toHaveBeenCalledTimes(1);
    expect(result.current.isStatusUnknown).toBe(false);
  });

  it('shows the head of the retry chain', async () => {
    getById.mockResolvedValue(
      read({
        status: AudioGenerationStatus.FAILED,
        latest: read({ id: 'a2', status: AudioGenerationStatus.COMPLETED }),
      }),
    );
    const { result } = renderHook(() => useAudioGenerationState({ generationId: 'a1' }));
    await waitFor(() => {
      expect(result.current.generation?.id).toBe('a2');
    });
  });

  it('retries the shown row and reads again', async () => {
    getById.mockResolvedValue(read({ status: AudioGenerationStatus.FAILED }));
    retry.mockResolvedValue({ id: 'a2', status: AudioGenerationStatus.QUEUED });
    const { result } = renderHook(() => useAudioGenerationState({ generationId: 'a1' }));
    await waitFor(() => {
      expect(result.current.generation?.status).toBe(AudioGenerationStatus.FAILED);
    });
    act(() => {
      result.current.handleRetry();
    });
    await waitFor(() => {
      expect(retry).toHaveBeenCalledWith('a1');
      expect(getById).toHaveBeenCalledTimes(2);
    });
  });

  it('gives up after repeated failed reads', async () => {
    vi.useFakeTimers();
    getById.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useAudioGenerationState({ generationId: 'a1' }));
    for (let i = 0; i < AUDIO_GENERATION_MAX_CONSECUTIVE_ERRORS; i += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
      });
    }
    vi.useRealTimers();
    expect(result.current.isStatusUnknown).toBe(true);
    expect(getById).toHaveBeenCalledTimes(AUDIO_GENERATION_MAX_CONSECUTIVE_ERRORS);
  });
});
