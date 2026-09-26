import { Test } from '@nestjs/testing';
import { PROMETHEUS_TEXT_CONTENT_TYPE } from '@claw/shared-utilities';

import { IS_PUBLIC_KEY } from '../../../app/decorators/public.decorator';
import {
  MediaJobKind,
  TranscriptionAttemptStatus,
  TranscriptionMetricOutcome,
  TranscriptionMetricSource,
  VideoProcessingOutcome,
} from '../../../common/enums';
import { MetricsController } from '../controllers/metrics.controller';
import { MetricsModule } from '../metrics.module';
import { FileMediaMetricsService } from '../services/file-media-metrics.service';

describe('file-service /metrics', () => {
  it('is public (Prometheus has no JWT) and serves the Prometheus text type', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, MetricsController)).toBe(true);
    const headers: unknown = Reflect.getMetadata('__headers__', MetricsController.prototype.scrape);
    expect(headers).toEqual([{ name: 'Content-Type', value: PROMETHEUS_TEXT_CONTENT_TYPE }]);
  });

  it('renders every declared metric, folding an unknown provider into other', async () => {
    const module = await Test.createTestingModule({ imports: [MetricsModule] }).compile();
    const metrics = module.get(FileMediaMetricsService);
    metrics.recordTranscriptionAttempt('OPENAI', TranscriptionMetricOutcome.RATE_LIMITED);
    metrics.recordTranscriptionAttempt('SOME-NEW-VENDOR', TranscriptionMetricOutcome.SUCCESS);
    metrics.recordTranscriptionJob(
      TranscriptionMetricSource.VIDEO_AUDIO,
      TranscriptionAttemptStatus.CANCELLED,
      1_500,
    );
    metrics.recordVideoJob(VideoProcessingOutcome.NO_SPEECH, 2_000);
    metrics.recordQueueWait(MediaJobKind.VIDEO, new Date(9_000).toISOString(), 10_000);
    metrics.recordQueueWait(MediaJobKind.VIDEO, 'not a date', 10_000);
    metrics.recordQueueWait(MediaJobKind.VIDEO, new Date(20_000).toISOString(), 10_000);

    const text = module.get(MetricsController).scrape();
    expect(text).toContain(
      'claw_file_transcription_attempts_total{provider="openai",outcome="rate_limited"} 1',
    );
    expect(text).toContain(
      'claw_file_transcription_attempts_total{provider="other",outcome="success"} 1',
    );
    expect(text).toContain(
      'claw_file_transcription_job_duration_seconds_sum{source="video_audio",status="cancelled"} 1.5',
    );
    expect(text).toContain('claw_file_video_processing_total{outcome="no_speech"} 1');
    expect(text).toContain('claw_file_media_queue_wait_seconds_count{job="video"} 1');
    expect(text).toContain('claw_file_media_queue_wait_seconds_sum{job="video"} 1');
  });
});
