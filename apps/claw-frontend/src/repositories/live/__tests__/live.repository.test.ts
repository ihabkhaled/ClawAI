import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LiveExportFormat, LiveHeartbeatState, LiveMode } from '@/enums/live.enum';
import { liveRepository } from '@/repositories/live/live.repository';
import { apiClient } from '@/services/shared/api-client';

vi.mock('@/services/shared/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), postBlob: vi.fn(), delete: vi.fn() },
}));

describe('liveRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: 'g', status: 200 });
    vi.mocked(apiClient.post).mockResolvedValue({ data: 'p', status: 200 });
    vi.mocked(apiClient.postBlob).mockResolvedValue({ data: new Blob(['x']), status: 200 });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined, status: 204 });
  });

  it('resolves a source with only the url', async () => {
    await liveRepository.resolveSource({ url: 'https://example.com/live.m3u8' });
    expect(apiClient.post).toHaveBeenCalledWith('/live/sources/resolve', {
      url: 'https://example.com/live.m3u8',
    });
  });

  it('creates a session with the exact body', async () => {
    await liveRepository.createSession({
      url: 'https://example.com/live.m3u8',
      language: 'de',
      mode: LiveMode.AUDIO_VISION,
      attestRights: true,
    });
    expect(apiClient.post).toHaveBeenCalledWith('/live/sessions', {
      url: 'https://example.com/live.m3u8',
      language: 'de',
      mode: 'AUDIO_VISION',
      attestRights: true,
    });
  });

  it('sends the heartbeat body, omitting seekableFromAt when absent (the server rejects null)', async () => {
    await liveRepository.heartbeat('s1', {
      state: LiveHeartbeatState.PAUSED,
      playbackAt: 1_700_000_000_000,
      atLiveEdge: false,
    });
    expect(apiClient.post).toHaveBeenLastCalledWith('/live/sessions/s1/heartbeat', {
      state: 'PAUSED',
      playbackAt: 1_700_000_000_000,
      atLiveEdge: false,
    });
    await liveRepository.heartbeat('s1', {
      state: LiveHeartbeatState.PLAYING,
      playbackAt: 1_700_000_000_000,
      atLiveEdge: true,
      seekableFromAt: 1_699_999_000_000,
    });
    expect(apiClient.post).toHaveBeenLastCalledWith('/live/sessions/s1/heartbeat', {
      state: 'PLAYING',
      playbackAt: 1_700_000_000_000,
      atLiveEdge: true,
      seekableFromAt: 1_699_999_000_000,
    });
  });

  it('approves credits with an empty body when no cap is given, and the cap when it is', async () => {
    await liveRepository.approveCredits('s1', {});
    expect(apiClient.post).toHaveBeenLastCalledWith('/live/sessions/s1/approve-credits', {});
    await liveRepository.approveCredits('s1', { spendingCapMicroUsd: 2_500_000 });
    expect(apiClient.post).toHaveBeenLastCalledWith('/live/sessions/s1/approve-credits', {
      spendingCapMicroUsd: 2_500_000,
    });
  });

  it('closes, deletes one and deletes all with DELETE', async () => {
    await liveRepository.closeSession('s1');
    expect(apiClient.delete).toHaveBeenLastCalledWith('/live/sessions/s1');
    await liveRepository.deleteHistoryItem('h1');
    expect(apiClient.delete).toHaveBeenLastCalledWith('/live/history/h1');
    await liveRepository.deleteAllHistory();
    expect(apiClient.delete).toHaveBeenLastCalledWith('/live/history');
  });

  it('pages history by cursor and sends no cursor on the first page', async () => {
    await liveRepository.listHistory(null);
    expect(apiClient.get).toHaveBeenLastCalledWith('/live/history', undefined, undefined);
    await liveRepository.listHistory('c2');
    expect(apiClient.get).toHaveBeenLastCalledWith('/live/history', { cursor: 'c2' }, undefined);
    await liveRepository.listHistoryEvents('h1', 'c3');
    expect(apiClient.get).toHaveBeenLastCalledWith(
      '/live/history/h1/events',
      { cursor: 'c3' },
      undefined,
    );
  });

  it('exports with the format and returns the blob', async () => {
    const blob = await liveRepository.exportHistory('h1', { format: LiveExportFormat.MARKDOWN });
    expect(apiClient.postBlob).toHaveBeenCalledWith('/live/history/h1/export', {
      format: 'MARKDOWN',
    });
    expect(blob).toBeInstanceOf(Blob);
  });

  it('asks for an estimate first and confirms second, with the provider as its own field', async () => {
    await liveRepository.enhanceEvent('e1', {
      modelId: 'meta-llama/llama-3.3-70b',
      provider: 'OPENROUTER',
      confirm: false,
    });
    expect(apiClient.post).toHaveBeenLastCalledWith('/live/events/e1/enhance', {
      modelId: 'meta-llama/llama-3.3-70b',
      provider: 'OPENROUTER',
      confirm: false,
    });
    await liveRepository.enhanceEvent('e1', {
      modelId: 'gemini-2.5-flash',
      provider: 'GEMINI',
      confirm: true,
    });
    expect(apiClient.post).toHaveBeenLastCalledWith('/live/events/e1/enhance', {
      modelId: 'gemini-2.5-flash',
      provider: 'GEMINI',
      confirm: true,
    });
  });

  it('reads versions and usage', async () => {
    await liveRepository.listEventVersions('e1');
    expect(apiClient.get).toHaveBeenLastCalledWith('/live/events/e1/versions');
    await liveRepository.getUsage();
    expect(apiClient.get).toHaveBeenLastCalledWith('/live/usage');
  });
});
