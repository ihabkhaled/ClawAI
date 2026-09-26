import {
  type CounterDefinition,
  type HistogramDefinition,
  METRIC_DEFAULT_DURATION_BUCKETS_SECONDS,
} from '@claw/shared-utilities';

import {
  MediaJobKind,
  TranscriptionAttemptStatus,
  TranscriptionMetricOutcome,
  TranscriptionMetricSource,
  VideoProcessingOutcome,
} from '../../../common/enums';
import { TRANSCRIPTION_PROVIDER_PRIORITY } from '../../files/constants/transcription.constants';

/**
 * file-service's media metrics (pack §67, ADR-113 addendum "media metrics").
 * Labels are enums and the transcription provider list — never a file id, a
 * user id or a model name (rules/19). Anything else is recorded as `other`.
 */
export const TRANSCRIPTION_ATTEMPT_METRIC: CounterDefinition = {
  name: 'claw_file_transcription_attempts_total',
  help: 'Transcription provider calls, by provider and outcome.',
  labels: {
    provider: TRANSCRIPTION_PROVIDER_PRIORITY,
    outcome: Object.values(TranscriptionMetricOutcome),
  },
};

export const TRANSCRIPTION_JOB_DURATION_METRIC: HistogramDefinition = {
  name: 'claw_file_transcription_job_duration_seconds',
  help: 'Seconds one transcription job took (every provider call and retry), by source and final status.',
  labels: {
    source: Object.values(TranscriptionMetricSource),
    status: Object.values(TranscriptionAttemptStatus),
  },
  buckets: METRIC_DEFAULT_DURATION_BUCKETS_SECONDS,
};

export const VIDEO_PROCESSING_DURATION_METRIC: HistogramDefinition = {
  name: 'claw_file_video_processing_duration_seconds',
  help: 'Seconds one video job took from start to its single write, by outcome.',
  labels: { outcome: Object.values(VideoProcessingOutcome) },
  buckets: METRIC_DEFAULT_DURATION_BUCKETS_SECONDS,
};

export const VIDEO_PROCESSING_METRIC: CounterDefinition = {
  name: 'claw_file_video_processing_total',
  help: 'Video jobs that ended, by outcome.',
  labels: { outcome: Object.values(VideoProcessingOutcome) },
};

export const MEDIA_QUEUE_WAIT_METRIC: HistogramDefinition = {
  name: 'claw_file_media_queue_wait_seconds',
  help: 'Seconds between a media job being published and a consumer starting it, by job.',
  labels: { job: Object.values(MediaJobKind) },
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 300],
};

export const MS_PER_SECOND = 1_000;
