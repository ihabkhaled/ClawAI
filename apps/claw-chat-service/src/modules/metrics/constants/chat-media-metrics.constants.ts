import {
  type CounterDefinition,
  type HistogramDefinition,
  METRIC_DEFAULT_DURATION_BUCKETS_SECONDS,
} from '@claw/shared-utilities';

import {
  FileDeliveryMode,
  SpeechAttemptOutcome,
  SpeechJobStatus,
  SpeechProvider,
  VisionHelperOutcome,
} from '../../../common/enums';

/**
 * chat-service's media metrics (pack §67, ADR-113 addendum "media metrics").
 * Every label's values are an enum of this service — never a user, file,
 * thread, message or free-text model id (rules/19). A value outside the list
 * is recorded as `other`.
 */
export const ATTACHMENT_DELIVERY_METRIC: CounterDefinition = {
  name: 'claw_chat_attachment_delivery_total',
  help: 'Attachments resolved for a lane, by how they reached the model (FileDeliveryMode).',
  labels: { mode: Object.values(FileDeliveryMode) },
};

export const VISION_HELPER_METRIC: CounterDefinition = {
  name: 'claw_chat_vision_helper_calls_total',
  help: 'Vision-helper attempts (a helper model describing an image for a blind lane), by outcome.',
  labels: { outcome: Object.values(VisionHelperOutcome) },
};

export const TTS_SEGMENT_METRIC: CounterDefinition = {
  name: 'claw_chat_tts_segment_attempts_total',
  help: 'Read-aloud provider attempts per segment, by speech provider and outcome.',
  labels: {
    provider: Object.values(SpeechProvider),
    outcome: Object.values(SpeechAttemptOutcome),
  },
};

export const TTS_FIRST_SEGMENT_METRIC: HistogramDefinition = {
  name: 'claw_chat_tts_first_segment_seconds',
  help: 'Seconds from a read-aloud job start until its first segment is stored and playable.',
  labels: { provider: Object.values(SpeechProvider) },
  buckets: [1, 2, 3, 5, 7.5, 10, 15, 20, 30, 45, 60, 120, 180],
};

export const TTS_JOB_METRIC: CounterDefinition = {
  name: 'claw_chat_tts_jobs_total',
  help: 'Read-aloud jobs that ended, by final status.',
  labels: { status: Object.values(SpeechJobStatus) },
};

export const TTS_JOB_DURATION_METRIC: HistogramDefinition = {
  name: 'claw_chat_tts_job_duration_seconds',
  help: 'Wall-clock seconds of a read-aloud job, by final status.',
  labels: { status: Object.values(SpeechJobStatus) },
  buckets: METRIC_DEFAULT_DURATION_BUCKETS_SECONDS,
};

export const MS_PER_SECOND = 1_000;
