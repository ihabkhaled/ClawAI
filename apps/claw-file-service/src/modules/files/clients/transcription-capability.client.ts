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
  private static cached: { capability: TranscriptionCapability | null; expiresAt: number } | null =
    null;

  /** Drops the memoised answer. Called by tests and after a connector sync. */
  static invalidate(): void {
    TranscriptionCapabilityClient.cached = null;
  }

  async findCapableModel(): Promise<TranscriptionCapability | null> {
    const now = Date.now();
    const hit = TranscriptionCapabilityClient.cached;
    if (hit !== null && hit.expiresAt > now) {
      return hit.capability;
    }

    const capability = await this.resolve();
    TranscriptionCapabilityClient.cached = {
      capability,
      expiresAt: now + TRANSCRIPTION_CAPABILITY_CACHE_TTL_MS,
    };
    return capability;
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

  private async resolve(): Promise<TranscriptionCapability | null> {
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
      this.logger.warn(`resolve: models-snapshot unavailable — ${message}`);
      return null;
    }

    // Priority order drives the search, not the snapshot's order: the FIRST
    // provider in TRANSCRIPTION_PROVIDER_PRIORITY that has an audio-capable
    // row wins, so GEMINI beats OPENAI even when OpenAI's rows come first.
    for (const provider of TRANSCRIPTION_PROVIDER_PRIORITY) {
      const match = models.find(
        (model) => model.provider === provider && this.supportsAudio(model),
      );
      if (match !== undefined) {
        this.logger.log(`resolve: audio-capable model ${provider}/${match.modelKey}`);
        return { provider, model: match.modelKey };
      }
    }

    this.logger.warn(
      `resolve: none of [${TRANSCRIPTION_PROVIDER_PRIORITY.join(', ')}] has an audio-capable model in the snapshot (${String(models.length)} models seen)`,
    );
    return null;
  }

  private supportsAudio(model: TranscriptionSnapshotEntry): boolean {
    return model.supportsAudio === true
      ? true
      : (model.modalitiesIn ?? []).includes(TRANSCRIPTION_AUDIO_MODALITY);
  }
}
