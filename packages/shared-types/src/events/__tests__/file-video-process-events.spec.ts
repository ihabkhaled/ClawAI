import {
  EventPattern,
  type FileVideoProcessCompletedPayload,
  type FileVideoProcessFailedPayload,
  type FileVideoProcessRequestedPayload,
} from '..';
import { VideoAudioStatus, VideoProcessingFailureReason } from '../../enums';

// Multimodal batch 7 — the video job's wire contract. The routing keys are
// asserted literally because producer and consumer both key a durable queue on
// them; a rename would strand every message already queued under the old key.
describe('file video-process events', () => {
  it('uses the canonical routing keys', () => {
    expect(EventPattern.FILE_VIDEO_PROCESS_REQUESTED).toBe('file.video_process_requested');
    expect(EventPattern.FILE_VIDEO_PROCESS_COMPLETED).toBe('file.video_process_completed');
    expect(EventPattern.FILE_VIDEO_PROCESS_FAILED).toBe('file.video_process_failed');
  });

  it('carries identifiers only — never bytes or transcript text', () => {
    const requested = {
      fileId: 'f1',
      userId: 'u1',
      filename: 'clip.mp4',
      mimeType: 'video/mp4',
      timestamp: new Date().toISOString(),
    } satisfies FileVideoProcessRequestedPayload;
    const completed = {
      fileId: 'f1',
      userId: 'u1',
      durationMs: 12_000,
      hasAudio: true,
      audioStatus: VideoAudioStatus.TRANSCRIBED,
      transcriptSegmentCount: 3,
      processingMs: 900,
      timestamp: new Date().toISOString(),
    } satisfies FileVideoProcessCompletedPayload;

    expect(requested).not.toHaveProperty('content');
    expect(completed).not.toHaveProperty('transcript');
    expect(completed).not.toHaveProperty('extractedText');
  });

  it('names every failure with an enum value', () => {
    const failed = {
      fileId: 'f1',
      userId: 'u1',
      reasonCode: VideoProcessingFailureReason.VIDEO_TOO_LONG_FOR_PLAN,
      reason: 'This video is 61 seconds long; your plan processes videos up to 60 seconds.',
      timestamp: new Date().toISOString(),
    } satisfies FileVideoProcessFailedPayload;

    expect(Object.values(VideoProcessingFailureReason)).toContain(failed.reasonCode);
    expect(Object.values(VideoAudioStatus)).toEqual([
      'TRANSCRIBED',
      'NO_AUDIO_TRACK',
      'EXTRACTION_FAILED',
      'TRANSCRIPTION_FAILED',
      'ENTITLEMENTS_UNAVAILABLE',
    ]);
  });
});
