import { VideoAudioStatus, VideoProcessingFailureReason } from '@claw/shared-types';

import { VideoProcessingOutcome } from '../../../../common/enums';
import { type VideoAnalysis, type VideoProbeSummary } from '../../types/video-processing.types';
import { videoProcessingOutcome } from '../video-processing-outcome.utility';

const summary = {} as VideoProbeSummary;

const ok = (status: VideoAudioStatus): VideoAnalysis => ({
  ok: true,
  summary,
  thumbnail: null,
  audio: { status, segments: [], reason: null, provider: null, model: null },
});

const failed = (reason: VideoProcessingFailureReason): VideoAnalysis => ({
  ok: false,
  reason,
  message: 'x',
  summary: null,
  thumbnail: null,
});

describe('videoProcessingOutcome', () => {
  it.each([
    [VideoAudioStatus.TRANSCRIBED, VideoProcessingOutcome.COMPLETED],
    [VideoAudioStatus.NO_SPEECH, VideoProcessingOutcome.NO_SPEECH],
    [VideoAudioStatus.NO_AUDIO_TRACK, VideoProcessingOutcome.NO_AUDIO],
    [VideoAudioStatus.TRANSCRIPTION_FAILED, VideoProcessingOutcome.TRANSCRIPTION_FAILED],
    [VideoAudioStatus.EXTRACTION_FAILED, VideoProcessingOutcome.TRANSCRIPTION_FAILED],
    [VideoAudioStatus.ENTITLEMENTS_UNAVAILABLE, VideoProcessingOutcome.TRANSCRIPTION_FAILED],
  ])('a document with audio %s counts as %s', (status, outcome) => {
    expect(videoProcessingOutcome(ok(status))).toBe(outcome);
  });

  it('a cancel is CANCELLED and every other failure is FAILED', () => {
    expect(videoProcessingOutcome(failed(VideoProcessingFailureReason.PROCESSING_CANCELLED))).toBe(
      VideoProcessingOutcome.CANCELLED,
    );
    expect(
      videoProcessingOutcome(failed(VideoProcessingFailureReason.VIDEO_TOO_LONG_FOR_PLAN)),
    ).toBe(VideoProcessingOutcome.FAILED);
  });
});
