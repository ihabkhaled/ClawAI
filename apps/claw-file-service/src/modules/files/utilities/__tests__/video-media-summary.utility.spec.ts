import { VideoProcessingFailureReason } from '@claw/shared-types';

import { readVideoMediaSummary } from '../video-media-summary.utility';

describe('readVideoMediaSummary', () => {
  it('reads the probe facts of a processed video', () => {
    expect(
      readVideoMediaSummary('video/webm', {
        media: { durationMs: 5_000, width: 640, height: 360, hasAudio: false, sizeBytes: 1 },
      }),
    ).toEqual({ durationMs: 5_000, width: 640, height: 360, hasAudio: false, failureReason: null });
  });

  it('carries the failure reason so a plan refusal can be told apart', () => {
    expect(
      readVideoMediaSummary('video/mp4', {
        media: {
          durationMs: 90_000,
          failureReason: VideoProcessingFailureReason.VIDEO_TOO_LONG_FOR_PLAN,
        },
      })?.failureReason,
    ).toBe(VideoProcessingFailureReason.VIDEO_TOO_LONG_FOR_PLAN);
  });

  it.each([
    ['not a video', 'image/png', { media: { durationMs: 1 } }],
    ['no metadata yet', 'video/mp4', null],
    ['malformed metadata', 'video/mp4', { media: { durationMs: 'long' } }],
    ['unknown failure reason', 'video/mp4', { media: { failureReason: 'NOPE' } }],
  ])('returns null for %s', (_label, mimeType, metadata) => {
    expect(readVideoMediaSummary(mimeType, metadata)).toBeNull();
  });
});
