import { Injectable } from '@nestjs/common';
import { type MetricCounter, type MetricHistogram, MetricsRegistry } from '@claw/shared-utilities';

import type {
  FileDeliveryMode,
  SpeechAttemptOutcome,
  SpeechJobStatus,
  SpeechProvider,
  VisionHelperOutcome,
} from '../../../common/enums';
import {
  ATTACHMENT_DELIVERY_METRIC,
  MS_PER_SECOND,
  TTS_FIRST_SEGMENT_METRIC,
  TTS_JOB_DURATION_METRIC,
  TTS_JOB_METRIC,
  TTS_SEGMENT_METRIC,
  VISION_HELPER_METRIC,
} from '../constants/chat-media-metrics.constants';

/**
 * chat-service's media metrics, scraped at `GET /api/v1/metrics` (internal
 * only). One registry per replica; PromQL sums the four. Recording never
 * throws and takes enum values only, so no id can become a label.
 */
@Injectable()
export class ChatMediaMetricsService {
  private readonly registry = new MetricsRegistry();
  private readonly delivery: MetricCounter = this.registry.counter(ATTACHMENT_DELIVERY_METRIC);
  private readonly visionHelper: MetricCounter = this.registry.counter(VISION_HELPER_METRIC);
  private readonly ttsSegments: MetricCounter = this.registry.counter(TTS_SEGMENT_METRIC);
  private readonly ttsFirstSegment: MetricHistogram =
    this.registry.histogram(TTS_FIRST_SEGMENT_METRIC);
  private readonly ttsJobs: MetricCounter = this.registry.counter(TTS_JOB_METRIC);
  private readonly ttsJobDuration: MetricHistogram =
    this.registry.histogram(TTS_JOB_DURATION_METRIC);

  recordAttachmentDelivery(mode: FileDeliveryMode): void {
    this.delivery.inc({ mode });
  }

  recordVisionHelper(outcome: VisionHelperOutcome): void {
    this.visionHelper.inc({ outcome });
  }

  recordTtsSegmentAttempt(provider: SpeechProvider, outcome: SpeechAttemptOutcome): void {
    this.ttsSegments.inc({ provider, outcome });
  }

  recordTtsFirstSegment(provider: SpeechProvider, elapsedMs: number): void {
    this.ttsFirstSegment.observe({ provider }, elapsedMs / MS_PER_SECOND);
  }

  recordTtsJob(status: SpeechJobStatus, elapsedMs: number): void {
    this.ttsJobs.inc({ status });
    this.ttsJobDuration.observe({ status }, elapsedMs / MS_PER_SECOND);
  }

  render(): string {
    return this.registry.render();
  }
}
