import { Injectable, Logger } from '@nestjs/common';
import { declaredHost, httpGet } from '@claw/shared-utilities';
import { AppConfig } from '../../../app/config/app.config';
import {
  LOCAL_SPEECH_HEALTH_PATH,
  LOCAL_SPEECH_PROBE_TIMEOUT_MS,
  LOCAL_TRANSCRIPTION_API_KEY,
  LOCAL_TRANSCRIPTION_MODEL,
  LOCAL_TRANSCRIPTION_PROVIDER,
  TRANSCRIPTION_CAPABILITY_CACHE_TTL_MS,
  TRANSCRIPTION_CONNECTOR_TIMEOUT_MS,
  TRANSCRIPTION_PROVIDER_PRIORITY,
} from '../constants/transcription.constants';
import {
  type TranscriptionCapability,
  type TranscriptionConnectorConfig,
  type TranscriptionSnapshotEntry,
  type TranscriptionSnapshotResponse,
} from '../types/transcription.types';
import { localSpeechApiBase, localSpeechHealthUrl } from '../utilities/local-speech.utility';
import { selectTranscriptionCandidates } from '../utilities/transcription-candidates.utility';

/**
 * Which provider, if any, can turn this audio into text.
 *
 * FAILS CLOSED, and that is the whole point of the class. An unknown context
 * window may be guessed at (chat-service's ModelContextWindowClient does), but
 * an unknown audio capability may not: guessing would mean posting a recording
 * to a text-only endpoint, getting a refusal back, and storing that refusal as
 * if it were the transcript. `findCapableModel` returning `null` is a real
 * answer — "nobody here can do this" — and the caller turns it into a refusal
 * the user can read.
 */
@Injectable()
export class TranscriptionCapabilityClient {
  private readonly logger = new Logger(TranscriptionCapabilityClient.name);

  // Static so every holder shares one answer, matching chat-service's
  // ModelContextWindowClient. The capability set is a property of the
  // deployment, not of the caller.
  private static cached: { capabilities: TranscriptionCapability[]; expiresAt: number } | null =
    null;

  /** Drops the memoised answer. Called by tests and after a connector sync. */
  static invalidate(): void {
    TranscriptionCapabilityClient.cached = null;
  }

  /**
   * The single best answer — kept for callers that only ever try one model.
   * `TranscriptionManager` uses `findCapableModels` instead so a wrong
   * `supportsAudio` row does not stop the whole request.
   */
  async findCapableModel(): Promise<TranscriptionCapability | null> {
    const capabilities = await this.findCapableModels();
    return capabilities.at(0) ?? null;
  }

  /**
   * The ranked candidate list (`selectTranscriptionCandidates`): providers in
   * `TRANSCRIPTION_PROVIDER_PRIORITY` order, up to two models each, stable
   * flash-lite/flash first, preview and non-transcription product lines only
   * when nothing stable exists. A row marked audio-capable can still be
   * refused by the provider (a stale catalog row — prod 2026-09-25 picked
   * `models/antigravity-preview-05-2026` because it sorted first), so the
   * caller walks this list instead of betting the job on one model.
   */
  async findCapableModels(): Promise<TranscriptionCapability[]> {
    const now = Date.now();
    const hit = TranscriptionCapabilityClient.cached;
    if (hit !== null && hit.expiresAt > now) {
      return hit.capabilities;
    }

    const capabilities = await this.resolveAll();
    TranscriptionCapabilityClient.cached = {
      capabilities,
      expiresAt: now + TRANSCRIPTION_CAPABILITY_CACHE_TTL_MS,
    };
    return capabilities;
  }

  async fetchConnectorConfig(provider: string): Promise<TranscriptionConnectorConfig> {
    if (provider === LOCAL_TRANSCRIPTION_PROVIDER) {
      // Not a connector: the container needs no key and its URL is deployment config.
      const apiBase = localSpeechApiBase(AppConfig.get().LOCAL_SPEECH_BASE_URL);
      if (apiBase === null) {
        throw new Error('Local speech is not configured');
      }
      return { provider, apiKey: LOCAL_TRANSCRIPTION_API_KEY, baseUrl: apiBase };
    }
    const base = AppConfig.get().CONNECTOR_SERVICE_URL;
    const url = `${base}/api/v1/internal/connectors/config?provider=${encodeURIComponent(provider)}`;
    const config = await httpGet<TranscriptionConnectorConfig>(
      url,
      { timeout: TRANSCRIPTION_CONNECTOR_TIMEOUT_MS },
      declaredHost(base),
    );
    if (typeof config.apiKey !== 'string' || config.apiKey.length === 0) {
      throw new Error(`Connector ${provider} returned no API key`);
    }
    return config;
  }

  private async resolveAll(): Promise<TranscriptionCapability[]> {
    let models: TranscriptionSnapshotEntry[];
    try {
      const base = AppConfig.get().CONNECTOR_SERVICE_URL;
      const url = `${base}/api/v1/internal/connectors/models-snapshot`;
      const snapshot = await httpGet<TranscriptionSnapshotResponse>(
        url,
        { timeout: TRANSCRIPTION_CONNECTOR_TIMEOUT_MS },
        declaredHost(base),
      );
      models = Array.isArray(snapshot.models) ? snapshot.models : [];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`resolveAll: models-snapshot unavailable — ${message}`);
      return this.localCandidate();
    }

    // Ranking, not snapshot order, decides who goes first: the snapshot is
    // sorted by key, and the first GEMINI key alphabetically was a preview.
    const capabilities = [
      ...selectTranscriptionCandidates(models),
      // LAST: the free container is the fallback when every cloud provider is
      // absent, or has refused, and the only candidate when none is capable.
      ...(await this.localCandidate()),
    ];
    for (const [index, capability] of capabilities.entries()) {
      this.logger.log(
        `resolveAll: candidate ${String(index + 1)} ${capability.provider}/${capability.model}`,
      );
    }

    if (capabilities.length === 0) {
      this.logger.warn(
        `resolveAll: none of [${TRANSCRIPTION_PROVIDER_PRIORITY.join(', ')}] has an audio-capable model in the snapshot (${String(models.length)} models seen)`,
      );
    }
    return capabilities;
  }

  /**
   * The LOCAL candidate, or none. Offered only when the container answers its
   * health check: a stopped `speech` service (API-only installs never create
   * it) must not become a candidate that costs a failed call on every job.
   */
  private async localCandidate(): Promise<TranscriptionCapability[]> {
    const apiBase = localSpeechApiBase(AppConfig.get().LOCAL_SPEECH_BASE_URL);
    if (apiBase === null) {
      return [];
    }
    try {
      await httpGet<unknown>(
        localSpeechHealthUrl(apiBase, LOCAL_SPEECH_HEALTH_PATH),
        { timeout: LOCAL_SPEECH_PROBE_TIMEOUT_MS },
        declaredHost(apiBase),
      );
      return [{ provider: LOCAL_TRANSCRIPTION_PROVIDER, model: LOCAL_TRANSCRIPTION_MODEL }];
    } catch {
      this.logger.debug('localCandidate: local speech container is not reachable');
      return [];
    }
  }
}
