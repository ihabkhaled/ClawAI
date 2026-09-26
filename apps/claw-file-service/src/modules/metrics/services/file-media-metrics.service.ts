import { Injectable } from '@nestjs/common';
import { type MetricCounter, type MetricHistogram, MetricsRegistry } from '@claw/shared-utilities';

import type {
  MediaJobKind,
  TranscriptionAttemptStatus,
  TranscriptionMetricOutcome,
  TranscriptionMetricSource,
  VideoProcessingOutcome,
} from '../../../common/enums';
import {
  MEDIA_QUEUE_WAIT_METRIC,
  MS_PER_SECOND,
  TRANSCRIPTION_ATTEMPT_METRIC,
  TRANSCRIPTION_JOB_DURATION_METRIC,
  VIDEO_PROCESSING_DURATION_METRIC,
  VIDEO_PROCESSING_METRIC,
} from '../constants/file-media-metrics.constants';

/**
 * file-service's media metrics, scraped at `GET /api/v1/metrics` (internal
 * only). Recording never throws and takes enum values only.
 */
@Injectable()
export class FileMediaMetricsService {
  private readonly registry = new MetricsRegistry();
  private readonly transcriptionAttempts: MetricCounter = this.registry.counter(
    TRANSCRIPTION_ATTEMPT_METRIC,
  );
  private readonly transcriptionJobs: MetricHistogram = this.registry.histogram(
    TRANSCRIPTION_JOB_DURATION_METRIC,
  );
  private readonly videoJobs: MetricCounter = this.registry.counter(VIDEO_PROCESSING_METRIC);
  private readonly videoDuration: MetricHistogram = this.registry.histogram(
    VIDEO_PROCESSING_DURATION_METRIC,
  );
  private readonly queueWait: MetricHistogram = this.registry.histogram(MEDIA_QUEUE_WAIT_METRIC);

  recordTranscriptionAttempt(provider: string, outcome: TranscriptionMetricOutcome): void {
    this.transcriptionAttempts.inc({ provider, outcome });
  }

  recordTranscriptionJob(
    source: TranscriptionMetricSource,
    status: TranscriptionAttemptStatus,
    elapsedMs: number,
  ): void {
    this.transcriptionJobs.observe({ source, status }, elapsedMs / MS_PER_SECOND);
  }

  recordVideoJob(outcome: VideoProcessingOutcome, elapsedMs: number): void {
    this.videoJobs.inc({ outcome });
    this.videoDuration.observe({ outcome }, elapsedMs / MS_PER_SECOND);
  }

  /**
   * Publish → start, from the event's own ISO `timestamp`. A missing or
   * unparsable stamp, or a clock skew into the future, records nothing.
   */
  recordQueueWait(job: MediaJobKind, publishedAt: string | undefined, now: number): void {
    const published = publishedAt === undefined ? Number.NaN : Date.parse(publishedAt);
    if (Number.isFinite(published) && now >= published) {
      this.queueWait.observe({ job }, (now - published) / MS_PER_SECOND);
    }
  }

  render(): string {
    return this.registry.render();
  }
}
