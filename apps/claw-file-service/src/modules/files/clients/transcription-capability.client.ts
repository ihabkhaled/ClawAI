import { Injectable, Logger } from '@nestjs/common';
import { declaredHost, httpGet } from '@claw/shared-utilities';
import { AppConfig } from '../../../app/config/app.config';
import {
  TRANSCRIPTION_AUDIO_MODALITY,
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
   * Every audio-capable candidate, one per provider, in
   * `TRANSCRIPTION_PROVIDER_PRIORITY` order — not just the first. A model
   * marked `supportsAudio: true` in the connector catalog can still be
   * refused by the provider itself (a stale or over-broad sync, e.g. a
   * preview model the catalog got wrong); returning the whole ranked list
   * lets the caller fall through to the next provider instead of failing
   * outright on the first rejection.
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
      return [];
    }

    // Priority order drives the search, not the snapshot's order: GEMINI's
    // candidate is listed before OPENAI's even when OpenAI's rows come
    // first in the snapshot. One candidate per provider — the first
    // audio-capable row for each — so a caller that walks the whole list
    // tries GEMINI, then OPENAI, never two GEMINI rows in a row.
    const capabilities: TranscriptionCapability[] = [];
    for (const provider of TRANSCRIPTION_PROVIDER_PRIORITY) {
      const match = models.find(
        (model) => model.provider === provider && this.supportsAudio(model),
      );
      if (match !== undefined) {
        this.logger.log(`resolveAll: audio-capable model ${provider}/${match.modelKey}`);
        capabilities.push({ provider, model: match.modelKey });
      }
    }

    if (capabilities.length === 0) {
      this.logger.warn(
        `resolveAll: none of [${TRANSCRIPTION_PROVIDER_PRIORITY.join(', ')}] has an audio-capable model in the snapshot (${String(models.length)} models seen)`,
      );
    }
    return capabilities;
  }

  private supportsAudio(model: TranscriptionSnapshotEntry): boolean {
    return model.supportsAudio === true
      ? true
      : (model.modalitiesIn ?? []).includes(TRANSCRIPTION_AUDIO_MODALITY);
  }
}
