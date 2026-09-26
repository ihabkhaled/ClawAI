import { Test } from '@nestjs/testing';
import { PROMETHEUS_TEXT_CONTENT_TYPE } from '@claw/shared-utilities';

import { IS_PUBLIC_KEY } from '../../../app/decorators/public.decorator';
import {
  FileDeliveryMode,
  SpeechAttemptOutcome,
  SpeechJobStatus,
  SpeechProvider,
  VisionHelperOutcome,
} from '../../../common/enums';
import { MetricsController } from '../controllers/metrics.controller';
import { MetricsModule } from '../metrics.module';
import { ChatMediaMetricsService } from '../services/chat-media-metrics.service';

describe('chat-service /metrics', () => {
  it('is public (Prometheus has no JWT) and serves the Prometheus text type', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, MetricsController)).toBe(true);
    const headers: unknown = Reflect.getMetadata('__headers__', MetricsController.prototype.scrape);
    expect(headers).toEqual([{ name: 'Content-Type', value: PROMETHEUS_TEXT_CONTENT_TYPE }]);
  });

  it('renders every declared metric through the global module', async () => {
    const module = await Test.createTestingModule({ imports: [MetricsModule] }).compile();
    const metrics = module.get(ChatMediaMetricsService);
    metrics.recordAttachmentDelivery(FileDeliveryMode.NATIVE_AUDIO);
    metrics.recordAttachmentDelivery(FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT);
    metrics.recordVisionHelper(VisionHelperOutcome.TIMED_OUT);
    metrics.recordTtsSegmentAttempt(SpeechProvider.GEMINI, SpeechAttemptOutcome.RATE_LIMITED);
    metrics.recordTtsFirstSegment(SpeechProvider.GEMINI, 3_500);
    metrics.recordTtsJob(SpeechJobStatus.PARTIAL, 42_000);

    const text = module.get(MetricsController).scrape();
    expect(text).toContain('claw_chat_attachment_delivery_total{mode="native_audio"} 1');
    expect(text).toContain(
      'claw_chat_attachment_delivery_total{mode="video_frames_and_transcript"} 1',
    );
    expect(text).toContain('claw_chat_vision_helper_calls_total{outcome="timed_out"} 1');
    expect(text).toContain(
      'claw_chat_tts_segment_attempts_total{provider="gemini",outcome="rate_limited"} 1',
    );
    expect(text).toContain(
      'claw_chat_tts_first_segment_seconds_bucket{provider="gemini",le="5"} 1',
    );
    expect(text).toContain('claw_chat_tts_jobs_total{status="partial"} 1');
    expect(text).toContain('claw_chat_tts_job_duration_seconds_sum{status="partial"} 42');
  });
});
