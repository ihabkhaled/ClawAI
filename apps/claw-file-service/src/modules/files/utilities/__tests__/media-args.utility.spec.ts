// Multimodal batch 7 — ffprobe/ffmpeg argument arrays. These are the security
// boundary between a hostile upload and a native decoder, so each property is
// asserted directly: whitelists before every input, no user text, integers only.

import { describe, expect, it } from 'vitest';
import {
  MEDIA_DERIVED_AUDIO_FORMAT_WHITELIST,
  MEDIA_FORMAT_WHITELIST,
  MEDIA_PROTOCOL_WHITELIST,
  VIDEO_MAX_DURATION_MS,
} from '../../constants/video-processing.constants';
import {
  buildAudioExtractArgs,
  buildFrameArgs,
  buildProbeArgs,
  buildVolumeDetectArgs,
  formatSeekSeconds,
} from '../media-args.utility';

const INPUT = '/tmp/claw-media-AbC123/input';
const OUTPUT = '/tmp/claw-media-AbC123/out.jpg';
const SHELL_METACHARACTERS = /[;&|`$<>\n\r]/;

const allArgSets = (): string[][] => [
  buildProbeArgs(INPUT),
  buildAudioExtractArgs(INPUT, '/tmp/claw-media-AbC123/audio.mp3', 60),
  buildFrameArgs(INPUT, OUTPUT, 12_345, 768),
];

/** Every `-i` must be preceded, in the same invocation, by both whitelists. */
const guardPrecedesEveryInput = (args: string[]): boolean =>
  args.every((arg, index) => {
    if (arg !== '-i') {
      return true;
    }
    const before = args.slice(0, index);
    const protocol = before.indexOf('-protocol_whitelist');
    const format = before.indexOf('-format_whitelist');
    return (
      protocol >= 0 &&
      format >= 0 &&
      before[protocol + 1] === MEDIA_PROTOCOL_WHITELIST &&
      before[format + 1] === MEDIA_FORMAT_WHITELIST
    );
  });

describe('media argument arrays', () => {
  it('puts the protocol and format whitelists before EVERY input', () => {
    for (const args of allArgSets()) {
      expect(args).toContain('-i');
      expect(guardPrecedesEveryInput(args)).toBe(true);
    }
  });

  it('allows no network protocol and no playlist/concat demuxer', () => {
    expect(MEDIA_PROTOCOL_WHITELIST.split(',')).toEqual(['file', 'pipe']);
    for (const banned of [
      'hls',
      'concat',
      'http',
      'https',
      'tcp',
      'rtmp',
      'ftp',
      'subfile',
      'data',
    ]) {
      expect(MEDIA_FORMAT_WHITELIST.split(',')).not.toContain(banned);
      expect(MEDIA_PROTOCOL_WHITELIST.split(',')).not.toContain(banned);
    }
  });

  it('carries no shell metacharacters — the only paths are the temp-dir paths passed in', () => {
    for (const args of allArgSets()) {
      for (const arg of args) {
        expect(arg).not.toMatch(SHELL_METACHARACTERS);
      }
    }
  });

  it('never reads stdin in ffmpeg runs, and ffprobe never gets the ffmpeg-only -nostdin', () => {
    expect(buildAudioExtractArgs(INPUT, OUTPUT, 10)).toContain('-nostdin');
    expect(buildFrameArgs(INPUT, OUTPUT, 0, 480)).toContain('-nostdin');
    expect(buildProbeArgs(INPUT)).not.toContain('-nostdin');
    for (const args of allArgSets()) {
      expect(args).toContain('-hide_banner');
    }
  });

  it('seeks BEFORE the input for a frame (fast input seek) and takes exactly one frame', () => {
    const args = buildFrameArgs(INPUT, OUTPUT, 1_500, 768);
    expect(args.indexOf('-ss')).toBeLessThan(args.indexOf('-i'));
    expect(args[args.indexOf('-ss') + 1]).toBe('1.500');
    expect(args[args.indexOf('-frames:v') + 1]).toBe('1');
    expect(args[args.indexOf('-vf') + 1]).toBe("scale='min(768,iw)':-2");
    expect(args.at(-1)).toBe(OUTPUT);
  });

  it('extracts 16 kHz mono 32 kbps MP3 from the first audio stream, capped in seconds', () => {
    const args = buildAudioExtractArgs(INPUT, '/tmp/x/audio.mp3', 59.2);
    expect(args[args.indexOf('-map') + 1]).toBe('0:a:0');
    expect(args[args.indexOf('-ac') + 1]).toBe('1');
    expect(args[args.indexOf('-ar') + 1]).toBe('16000');
    expect(args[args.indexOf('-b:a') + 1]).toBe('32k');
    expect(args[args.indexOf('-t') + 1]).toBe('60');
  });

  it('volumedetect reads only the derived MP3: whitelists first, mp3 demuxer only, no output file', () => {
    const audioPath = '/tmp/claw-media-AbC123/audio.mp3';
    const args = buildVolumeDetectArgs(audioPath);
    const input = args.indexOf('-i');
    expect(args[input + 1]).toBe(audioPath);
    expect(args.indexOf('-protocol_whitelist')).toBeLessThan(input);
    expect(args[args.indexOf('-protocol_whitelist') + 1]).toBe(MEDIA_PROTOCOL_WHITELIST);
    expect(args.indexOf('-format_whitelist')).toBeLessThan(input);
    expect(args[args.indexOf('-format_whitelist') + 1]).toBe(MEDIA_DERIVED_AUDIO_FORMAT_WHITELIST);
    expect(MEDIA_DERIVED_AUDIO_FORMAT_WHITELIST).toBe('mp3');
    expect(args).toContain('-nostdin');
    expect(args[args.indexOf('-af') + 1]).toBe('volumedetect');
    expect(args.slice(-3)).toEqual(['-f', 'null', '-']);
    expect(args.some((arg) => SHELL_METACHARACTERS.test(arg))).toBe(false);
  });
});

describe('formatSeekSeconds', () => {
  it.each([
    [0, '0.000'],
    [1, '0.001'],
    [12_345, '12.345'],
    [60_000, '60.000'],
  ])('formats %d ms as %s', (ms, expected) => {
    expect(formatSeekSeconds(ms)).toBe(expected);
  });

  it('never lets a NaN, a negative or a huge number become an argument', () => {
    expect(formatSeekSeconds(Number.NaN)).toBe('0.000');
    expect(formatSeekSeconds(-5)).toBe('0.000');
    expect(formatSeekSeconds(Number.POSITIVE_INFINITY)).toBe('0.000');
    expect(formatSeekSeconds(VIDEO_MAX_DURATION_MS * 10)).toBe(
      formatSeekSeconds(VIDEO_MAX_DURATION_MS),
    );
    expect(formatSeekSeconds(1.9)).toBe('0.001');
  });
});
