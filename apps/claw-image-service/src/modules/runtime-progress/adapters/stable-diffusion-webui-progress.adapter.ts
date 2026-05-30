import { Injectable, Logger } from '@nestjs/common';
import {
  type ClawRuntimeProgressEvent,
  RuntimeModality,
  RuntimeProgressConfidence,
  RuntimeProgressEventType,
  RuntimeProgressStage,
  RuntimeProvider,
} from '@claw/shared-types';
import { buildRuntimeProgressEvent } from '@claw/shared-utilities';
import { httpGet, httpPost } from '@common/utilities';
import {
  SD_INTERRUPT_HTTP_TIMEOUT_MS,
  SD_PROGRESS_HTTP_TIMEOUT_MS,
  SD_PROGRESS_MAX_CONSECUTIVE_ERRORS,
  SD_PROGRESS_POLL_DEFAULT_INTERVAL_MS,
  SD_PROGRESS_POLL_MIN_INTERVAL_MS,
} from '../constants/sd-webui-progress.constants';
import type {
  SdWebuiProgressAdapterContract,
  SdWebuiProgressResponse,
  SdWebuiProgressSession,
  SdWebuiProgressStartOptions,
} from '../types/sd-webui-progress.types';

/**
 * Polls AUTOMATIC1111 `/sdapi/v1/progress` and yields normalized
 * {@link ClawRuntimeProgressEvent} envelopes. Matches the reference probe in
 * `scripts/local-runtime-probes/probe-sd-webui.mjs` — same poll URL, same
 * stage derivation, same metric mapping. Caller owns the txt2img request;
 * this adapter only observes progress.
 *
 * The adapter is a NestJS singleton, so concurrent generations are isolated
 * by returning a per-call {@link SdWebuiProgressSession} object that owns
 * its own `stopRequested` flag — no shared mutable state on the service.
 */
@Injectable()
export class StableDiffusionWebuiProgressAdapter implements SdWebuiProgressAdapterContract {
  private readonly logger = new Logger(StableDiffusionWebuiProgressAdapter.name);

  start(opts: SdWebuiProgressStartOptions): SdWebuiProgressSession {
    const interval = Math.max(
      opts.intervalMs ?? SD_PROGRESS_POLL_DEFAULT_INTERVAL_MS,
      SD_PROGRESS_POLL_MIN_INTERVAL_MS,
    );
    const sessionState = { stopRequested: false, sequence: 0 };
    this.logger.debug(
      `start: runId=${opts.runId} interval=${String(interval)}ms preview=${String(opts.preview === true)}`,
    );

    const events = this.runPollLoop(opts, interval, sessionState);
    return {
      events,
      nextSequence: () => sessionState.sequence,
      stop: () => {
        sessionState.stopRequested = true;
      },
    };
  }

  async emitArtifactSaved(args: {
    runId: string;
    sdUrl: string;
    totalSteps: number;
    sequence: number;
    startedAtMs: number;
    artifactId: string;
    messageId?: string;
    modelId?: string;
  }): Promise<ClawRuntimeProgressEvent> {
    return buildRuntimeProgressEvent({
      runId: args.runId,
      provider: RuntimeProvider.STABLE_DIFFUSION_WEBUI,
      modality: RuntimeModality.IMAGE,
      eventType: RuntimeProgressEventType.ARTIFACT_SAVED,
      stage: RuntimeProgressStage.SAVING,
      sequence: args.sequence,
      runtimeUrl: args.sdUrl,
      artifactId: args.artifactId,
      messageId: args.messageId,
      modelId: args.modelId,
      rawProviderEventType: 'txt2img.response',
      metrics: {
        startedAtMs: args.startedAtMs,
        elapsedMs: Date.now() - args.startedAtMs,
        currentStep: args.totalSteps,
        totalSteps: args.totalSteps,
        progressPercent: 100,
        progressConfidence: RuntimeProgressConfidence.EXACT,
      },
    });
  }

  async cancel(sdUrl: string): Promise<void> {
    this.logger.log(`cancel: POST ${sdUrl}/sdapi/v1/interrupt`);
    try {
      await httpPost<unknown>(
        `${sdUrl}/sdapi/v1/interrupt`,
        {},
        { timeout: SD_INTERRUPT_HTTP_TIMEOUT_MS },
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'interrupt failed';
      this.logger.error(`cancel: interrupt request failed — ${msg}`);
      throw error;
    }
  }

  private async *runPollLoop(
    opts: SdWebuiProgressStartOptions,
    interval: number,
    sessionState: { stopRequested: boolean; sequence: number },
  ): AsyncGenerator<ClawRuntimeProgressEvent, void, void> {
    const skipCurrentImage = opts.preview === true ? 'false' : 'true';
    const progressUrl = `${opts.sdUrl}/sdapi/v1/progress?skip_current_image=${skipCurrentImage}`;
    const startedAtMs = Date.now();
    let consecutiveErrors = 0;

    yield buildRuntimeProgressEvent({
      runId: opts.runId,
      provider: RuntimeProvider.STABLE_DIFFUSION_WEBUI,
      modality: RuntimeModality.IMAGE,
      eventType: RuntimeProgressEventType.LIFECYCLE,
      stage: RuntimeProgressStage.CONNECTING,
      sequence: sessionState.sequence++,
      runtimeUrl: opts.sdUrl,
      messageId: opts.messageId,
      modelId: opts.modelId,
      metrics: {
        startedAtMs,
        elapsedMs: 0,
        totalSteps: opts.totalSteps,
        progressConfidence: RuntimeProgressConfidence.STAGE_ESTIMATED,
      },
    });

    while (!sessionState.stopRequested) {
      try {
        const json = await httpGet<SdWebuiProgressResponse>(progressUrl, {
          timeout: SD_PROGRESS_HTTP_TIMEOUT_MS,
        });
        consecutiveErrors = 0;
        const envelope = this.buildProgressEnvelope({
          opts,
          json,
          sequence: sessionState.sequence++,
          startedAtMs,
        });
        if (envelope) {
          yield envelope;
        }
      } catch (error: unknown) {
        consecutiveErrors += 1;
        const msg = error instanceof Error ? error.message : 'progress poll failed';
        this.logger.warn(`runPollLoop: poll error #${String(consecutiveErrors)} — ${msg}`);
        if (consecutiveErrors >= SD_PROGRESS_MAX_CONSECUTIVE_ERRORS) {
          this.logger.error(
            `runPollLoop: giving up after ${String(consecutiveErrors)} errors`,
          );
          return;
        }
      }
      await this.sleep(interval);
    }

    this.logger.debug('runPollLoop: stop requested — exiting poll loop');
  }

  private buildProgressEnvelope(args: {
    opts: SdWebuiProgressStartOptions;
    json: SdWebuiProgressResponse;
    sequence: number;
    startedAtMs: number;
  }): ClawRuntimeProgressEvent | undefined {
    const { opts, json, sequence, startedAtMs } = args;
    const samplingStep = json.state?.sampling_step ?? 0;
    const samplingSteps = json.state?.sampling_steps ?? opts.totalSteps;
    const progress = typeof json.progress === 'number' ? json.progress : 0;
    const etaRel = typeof json.eta_relative === 'number' ? json.eta_relative : undefined;
    const stage = this.deriveStage(progress);
    const elapsedMs = Date.now() - startedAtMs;
    const previewBase64 =
      opts.preview === true && typeof json.current_image === 'string'
        ? json.current_image
        : undefined;

    return buildRuntimeProgressEvent({
      runId: opts.runId,
      provider: RuntimeProvider.STABLE_DIFFUSION_WEBUI,
      modality: RuntimeModality.IMAGE,
      eventType: previewBase64
        ? RuntimeProgressEventType.IMAGE_PREVIEW
        : RuntimeProgressEventType.STEP_PROGRESS,
      stage,
      sequence,
      runtimeUrl: opts.sdUrl,
      messageId: opts.messageId,
      modelId: opts.modelId,
      rawProviderEventType: json.state?.job ?? 'progress',
      imagePreviewBase64: previewBase64,
      metrics: {
        startedAtMs,
        elapsedMs,
        currentStep: samplingStep,
        totalSteps: samplingSteps,
        progressPercent: progress * 100,
        progressConfidence: RuntimeProgressConfidence.RUNTIME_REPORTED,
        ...(etaRel !== undefined ? { samplingMs: etaRel * 1000 } : {}),
      },
    });
  }

  private deriveStage(progress: number): RuntimeProgressStage {
    if (progress <= 0) {
      return RuntimeProgressStage.QUEUED;
    }
    if (progress < 1) {
      return RuntimeProgressStage.GENERATING;
    }
    return RuntimeProgressStage.POST_PROCESSING;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
