// Multimodal batch 7 — ffprobe JSON → facts → verdict. The fixture mirrors
// real ffprobe 5.1 output for a 5 s 1280×720 h264 + aac mp4 (captured from
// the Debian bookworm image), trimmed to the keys the parser reads plus noise.

import { describe, expect, it } from 'vitest';
import { VideoProcessingFailureReason } from '@claw/shared-types';
import {
  parseFrameRate,
  parseProbeOutput,
  secondsStringToMs,
  validateProbeSummary,
} from '../video-probe.utility';
import { type VideoProbeSummary } from '../../types/video-processing.types';

const probeJson = (overrides: Record<string, unknown> = {}): string =>
  JSON.stringify({
    streams: [
      {
        index: 0,
        codec_name: 'h264',
        codec_type: 'video',
        width: 1280,
        height: 720,
        r_frame_rate: '30/1',
        avg_frame_rate: '30/1',
        duration: '5.000000',
        tags: { handler_name: 'VideoHandler' },
      },
      {
        index: 1,
        codec_name: 'aac',
        codec_type: 'audio',
        sample_rate: '44100',
        duration: '5.000000',
      },
    ],
    format: { format_name: 'mov,mp4,m4a,3gp,3g2,mj2', duration: '5.000000', size: '120000' },
    ...overrides,
  });

const summary = (overrides: Partial<VideoProbeSummary> = {}): VideoProbeSummary => ({
  hasVideo: true,
  durationMs: 5_000,
  width: 1280,
  height: 720,
  fps: 30,
  videoCodec: 'h264',
  audioCodec: 'aac',
  hasAudio: true,
  container: 'mov,mp4,m4a,3gp,3g2,mj2',
  ...overrides,
});

describe('parseProbeOutput', () => {
  it('reads duration, size, fps, codecs, audio presence and container', () => {
    expect(parseProbeOutput(probeJson())).toEqual(summary());
  });

  it('marks a video with no audio stream', () => {
    const json = probeJson({
      streams: [
        {
          codec_name: 'vp9',
          codec_type: 'video',
          width: 640,
          height: 360,
          avg_frame_rate: '0/0',
          r_frame_rate: '25/1',
        },
      ],
    });
    expect(parseProbeOutput(json)).toMatchObject({
      hasAudio: false,
      audioCodec: null,
      fps: 25,
      videoCodec: 'vp9',
    });
  });

  it('falls back to the video stream duration when the container has none', () => {
    const json = probeJson({ format: { format_name: 'matroska,webm' } });
    expect(parseProbeOutput(json)?.durationMs).toBe(5_000);
  });

  it('reports 0 ms when no duration exists anywhere', () => {
    const json = probeJson({
      streams: [{ codec_type: 'video', width: 10, height: 10 }],
      format: { format_name: 'avi' },
    });
    expect(parseProbeOutput(json)?.durationMs).toBe(0);
  });

  it('reports hasVideo=false for an audio-only container', () => {
    const json = probeJson({ streams: [{ codec_type: 'audio', codec_name: 'mp3' }] });
    expect(parseProbeOutput(json)).toMatchObject({ hasVideo: false, width: 0, height: 0 });
  });

  it.each([
    ['malformed JSON', '{"streams": [ '],
    ['not an object', '"hello"'],
    ['empty output', ''],
    ['streams missing', JSON.stringify({ format: {} })],
    ['width is a string', JSON.stringify({ streams: [{ codec_type: 'video', width: '1280' }] })],
    [
      'negative height',
      JSON.stringify({ streams: [{ codec_type: 'video', width: 10, height: -1 }] }),
    ],
    [
      'too many streams',
      JSON.stringify({ streams: Array.from({ length: 33 }, () => ({ codec_type: 'data' })) }),
    ],
  ])('returns null for %s (recorded as a corrupt container)', (_label, stdout) => {
    expect(parseProbeOutput(stdout)).toBeNull();
  });
});

describe('secondsStringToMs / parseFrameRate', () => {
  it.each([
    ['5.000000', 5_000],
    ['0.0405', 41],
    ['N/A', 0],
    ['-3', 0],
    [undefined, 0],
  ])('secondsStringToMs(%s) = %d', (value, expected) => {
    expect(secondsStringToMs(value)).toBe(expected);
  });

  it.each([
    ['30000/1001', 29.97],
    ['25/1', 25],
    ['0/0', null],
    ['abc', null],
    [undefined, null],
  ])('parseFrameRate(%s) = %s', (value, expected) => {
    expect(parseFrameRate(value)).toBe(expected);
  });
});

describe('validateProbeSummary', () => {
  it('accepts an ordinary video', () => {
    expect(validateProbeSummary(summary())).toBeNull();
  });

  it.each([
    ['no video stream', summary({ hasVideo: false }), VideoProcessingFailureReason.NO_VIDEO_STREAM],
    ['zero width', summary({ width: 0 }), VideoProcessingFailureReason.NO_VIDEO_STREAM],
    ['duration missing', summary({ durationMs: 0 }), VideoProcessingFailureReason.INVALID_DURATION],
    [
      '8K frame',
      summary({ width: 7680, height: 4320 }),
      VideoProcessingFailureReason.DIMENSIONS_TOO_LARGE,
    ],
    [
      'absurd dimensions',
      summary({ width: 65_535, height: 65_535 }),
      VideoProcessingFailureReason.DIMENSIONS_TOO_LARGE,
    ],
    [
      'over the 30-minute cap',
      summary({ durationMs: 30 * 60 * 1000 + 1 }),
      VideoProcessingFailureReason.DURATION_TOO_LONG,
    ],
  ])('rejects %s', (_label, input, reason) => {
    expect(validateProbeSummary(input)).toBe(reason);
  });

  it('accepts exactly 4K and exactly 30 minutes', () => {
    expect(
      validateProbeSummary(summary({ width: 3840, height: 2160, durationMs: 30 * 60 * 1000 })),
    ).toBeNull();
  });
});
