import { LIVE_API, LIVE_CHUNK_START_HEADER, LIVE_WAV_MIME_TYPE } from '@/constants/live.constants';
import { apiClient } from '@/services/shared/api-client';
import type {
  LiveApproveCreditsInput,
  LiveAudioChunkInput,
  LiveAudioChunkResult,
  LiveCardVersion,
  LiveCreateSessionInput,
  LiveCursorPage,
  LiveDeletionSummary,
  LiveEnhanceInput,
  LiveEnhanceResult,
  LiveExportInput,
  LiveHeartbeatInput,
  LiveHeartbeatResult,
  LiveHistoryEvent,
  LiveHistoryItem,
  LiveResolveSourceInput,
  LiveSession,
  LiveSessionStateView,
  LiveSourceResolution,
  LiveUsage,
} from '@/types/live.types';
import { buildLiveCursorParams } from '@/utilities/live-request.utility';

/** Live Intelligence user API (`/api/v1/live`, architecture doc section 9). One function per endpoint. */
export const liveRepository = {
  async resolveSource(input: LiveResolveSourceInput): Promise<LiveSourceResolution> {
    const response = await apiClient.post<LiveSourceResolution>(LIVE_API.RESOLVE, {
      url: input.url,
    });
    return response.data;
  },

  async createSession(input: LiveCreateSessionInput): Promise<LiveSession> {
    const response = await apiClient.post<LiveSession>(LIVE_API.SESSIONS, {
      url: input.url,
      language: input.language,
      mode: input.mode,
      attestRights: input.attestRights,
    });
    return response.data;
  },

  async heartbeat(sessionId: string, input: LiveHeartbeatInput): Promise<LiveHeartbeatResult> {
    // The server schema has `seekableFromAt` optional, not nullable: omit it, never send null.
    const response = await apiClient.post<LiveHeartbeatResult>(LIVE_API.HEARTBEAT(sessionId), {
      state: input.state,
      playbackAt: input.playbackAt,
      atLiveEdge: input.atLiveEdge,
      ...(input.seekableFromAt === undefined ? {} : { seekableFromAt: input.seekableFromAt }),
    });
    return response.data;
  },

  /** One tab-audio chunk: raw `audio/wav` body, its start in epoch ms as `X-Chunk-Start-At` (202). */
  async uploadAudio(sessionId: string, input: LiveAudioChunkInput): Promise<LiveAudioChunkResult> {
    const response = await apiClient.postRaw<LiveAudioChunkResult>(
      LIVE_API.AUDIO(sessionId),
      input.wav,
      {
        'Content-Type': LIVE_WAV_MIME_TYPE,
        [LIVE_CHUNK_START_HEADER]: String(Math.round(input.startAt)),
      },
    );
    return response.data;
  },

  async approveCredits(
    sessionId: string,
    input: LiveApproveCreditsInput,
  ): Promise<LiveSessionStateView> {
    const body =
      input.spendingCapMicroUsd === undefined
        ? {}
        : { spendingCapMicroUsd: input.spendingCapMicroUsd };
    const response = await apiClient.post<LiveSessionStateView>(
      LIVE_API.APPROVE_CREDITS(sessionId),
      body,
    );
    return response.data;
  },

  async closeSession(sessionId: string): Promise<LiveSessionStateView> {
    const response = await apiClient.delete<LiveSessionStateView>(LIVE_API.SESSION(sessionId));
    return response.data;
  },

  async listHistory(
    cursor: string | null,
    options?: { signal?: AbortSignal },
  ): Promise<LiveCursorPage<LiveHistoryItem>> {
    const response = await apiClient.get<LiveCursorPage<LiveHistoryItem>>(
      LIVE_API.HISTORY,
      buildLiveCursorParams(cursor),
      options,
    );
    return response.data;
  },

  async listHistoryEvents(
    sessionId: string,
    cursor: string | null,
    options?: { signal?: AbortSignal },
  ): Promise<LiveCursorPage<LiveHistoryEvent>> {
    const response = await apiClient.get<LiveCursorPage<LiveHistoryEvent>>(
      LIVE_API.HISTORY_EVENTS(sessionId),
      buildLiveCursorParams(cursor),
      options,
    );
    return response.data;
  },

  async exportHistory(sessionId: string, input: LiveExportInput): Promise<Blob> {
    const response = await apiClient.postBlob(LIVE_API.HISTORY_EXPORT(sessionId), {
      format: input.format,
    });
    return response.data;
  },

  async deleteHistoryItem(sessionId: string): Promise<LiveDeletionSummary> {
    const response = await apiClient.delete<LiveDeletionSummary>(LIVE_API.HISTORY_ITEM(sessionId));
    return response.data;
  },

  async deleteAllHistory(): Promise<LiveDeletionSummary> {
    const response = await apiClient.delete<LiveDeletionSummary>(LIVE_API.HISTORY);
    return response.data;
  },

  async listEventVersions(eventId: string): Promise<LiveCardVersion[]> {
    const response = await apiClient.get<LiveCardVersion[]>(LIVE_API.EVENT_VERSIONS(eventId));
    return response.data;
  },

  async enhanceEvent(eventId: string, input: LiveEnhanceInput): Promise<LiveEnhanceResult> {
    const response = await apiClient.post<LiveEnhanceResult>(LIVE_API.EVENT_ENHANCE(eventId), {
      modelId: input.modelId,
      provider: input.provider,
      confirm: input.confirm,
    });
    return response.data;
  },

  async getUsage(): Promise<LiveUsage> {
    const response = await apiClient.get<LiveUsage>(LIVE_API.USAGE);
    return response.data;
  },
};
