import { describe, expect, it } from 'vitest';

import { FILE_DELIVERY_MODES } from '@/constants';
import { FileDeliveryMode } from '@/enums';
import type { FileDeliveryEntry } from '@/types';
import {
  buildFileDeliveryBadges,
  buildFileDeliveryTooltip,
  countFileDeliveriesByMode,
  getFileDeliveryModeLabel,
  isFileDeliveryMode,
  readFileDeliveryFromMetadata,
} from '@/utilities/file-delivery.utility';

const identity = (key: string): string => key;

function entry(mode: FileDeliveryMode, fileId = 'f-1'): FileDeliveryEntry {
  return {
    fileId,
    filename: `${fileId}.bin`,
    mimeType: 'application/octet-stream',
    provider: 'GEMINI',
    model: 'gemini-2.5-flash',
    mode,
  };
}

describe('isFileDeliveryMode', () => {
  it('accepts every enum member, including the multimodal ones', () => {
    for (const mode of Object.values(FileDeliveryMode)) {
      expect(isFileDeliveryMode(mode)).toBe(true);
    }
    expect(FILE_DELIVERY_MODES.size).toBe(Object.values(FileDeliveryMode).length);
  });

  it('rejects garbage', () => {
    for (const value of ['', 'transcript', 'NOT_A_MODE', 42, null, undefined, {}]) {
      expect(isFileDeliveryMode(value)).toBe(false);
    }
  });
});

describe('getFileDeliveryModeLabel', () => {
  it('gives each mode its own label', () => {
    const labels = Object.values(FileDeliveryMode).map((mode) =>
      getFileDeliveryModeLabel(mode, identity),
    );
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('only TRUNCATED_TEXT resolves to the truncated label', () => {
    for (const mode of Object.values(FileDeliveryMode)) {
      const label = getFileDeliveryModeLabel(mode, identity);
      if (mode === FileDeliveryMode.TRUNCATED_TEXT) {
        expect(label).toBe('compare.delivery.truncatedText');
      } else {
        expect(label).not.toBe('compare.delivery.truncatedText');
      }
    }
  });

  it('maps the multimodal modes to their own keys', () => {
    expect(getFileDeliveryModeLabel(FileDeliveryMode.TRANSCRIPT, identity)).toBe(
      'compare.delivery.transcript',
    );
    expect(getFileDeliveryModeLabel(FileDeliveryMode.NATIVE_VIDEO, identity)).toBe(
      'compare.delivery.nativeVideo',
    );
    expect(getFileDeliveryModeLabel(FileDeliveryMode.STILL_PROCESSING, identity)).toBe(
      'compare.delivery.stillProcessing',
    );
    expect(getFileDeliveryModeLabel(FileDeliveryMode.FAILED_PROCESSING, identity)).toBe(
      'compare.delivery.failedProcessing',
    );
  });

  // ADR-120 batch 5: an image a helper described has its own label, never
  // "native image" (the model did not see it) and never "truncated".
  it('labels a helper-described image as described, not seen', () => {
    expect(getFileDeliveryModeLabel(FileDeliveryMode.DERIVED_IMAGE_TEXT, identity)).toBe(
      'compare.delivery.derivedImageText',
    );
    const badges = buildFileDeliveryBadges(
      countFileDeliveriesByMode([entry(FileDeliveryMode.DERIVED_IMAGE_TEXT)]),
      identity,
    );
    expect(badges.map((badge) => [badge.countKey, badge.label, badge.count])).toEqual([
      ['described', 'compare.delivery.derivedImageText', 1],
    ]);
  });
});

// Multimodal batch 8: a video the model could not watch natively, served as
// its timestamped transcript plus sampled frames.
describe('VIDEO_FRAMES_AND_TRANSCRIPT', () => {
  it('has its own label, never the native-video one', () => {
    expect(getFileDeliveryModeLabel(FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT, identity)).toBe(
      'compare.delivery.videoFramesAndTranscript',
    );
  });

  it('reads the sampled frame times from metadata and lists them in the tooltip', () => {
    const entries = readFileDeliveryFromMetadata({
      fileDelivery: [
        {
          ...entry(FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT),
          filename: 'clip.mp4',
          frameTimestampsMs: [5_000, 83_000, 'x', -1, 1.5],
        },
      ],
    });

    expect(entries?.[0]?.frameTimestampsMs).toEqual([5_000, 83_000]);
    const tooltip = buildFileDeliveryTooltip(entries ?? [], (key, params) =>
      params === undefined ? key : `${key}:${String(params['times'])}`,
    );
    expect(tooltip).toContain(
      'clip.mp4 (compare.delivery.videoFramesAndTranscript) — compare.delivery.videoFramesAt:00:05, 01:23',
    );
  });

  it('adds no frames suffix for a transcript-only delivery', () => {
    const tooltip = buildFileDeliveryTooltip(
      [entry(FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT)],
      identity,
    );
    expect(tooltip).not.toContain('videoFramesAt');
  });
});

describe('NATIVE_AUDIO', () => {
  it('has its own label and badge, never the transcript one', () => {
    expect(getFileDeliveryModeLabel(FileDeliveryMode.NATIVE_AUDIO, identity)).toBe(
      'compare.delivery.nativeAudio',
    );
    const badges = buildFileDeliveryBadges(
      countFileDeliveriesByMode([entry(FileDeliveryMode.NATIVE_AUDIO)]),
      identity,
    );
    expect(badges.map((badge) => [badge.countKey, badge.label, badge.count])).toEqual([
      ['audio', 'compare.delivery.nativeAudio', 1],
    ]);
  });

  it('is accepted from message metadata', () => {
    const entries =
      readFileDeliveryFromMetadata({
        fileDelivery: [{ ...entry(FileDeliveryMode.NATIVE_AUDIO), mode: 'NATIVE_AUDIO' }],
      }) ?? [];
    expect(entries.map((item) => item.mode)).toEqual([FileDeliveryMode.NATIVE_AUDIO]);
  });
});

describe('countFileDeliveriesByMode', () => {
  it('counts every mode into its own bucket', () => {
    const counts = countFileDeliveriesByMode([
      entry(FileDeliveryMode.EXTRACTED_TEXT),
      entry(FileDeliveryMode.NATIVE_IMAGE),
      entry(FileDeliveryMode.OMITTED_NO_VISION),
      entry(FileDeliveryMode.OMITTED_UNSUPPORTED),
      entry(FileDeliveryMode.TRUNCATED_TEXT),
      entry(FileDeliveryMode.TRANSCRIPT),
      entry(FileDeliveryMode.TRANSCRIPT, 'f-2'),
      entry(FileDeliveryMode.NATIVE_VIDEO),
      entry(FileDeliveryMode.STILL_PROCESSING),
      entry(FileDeliveryMode.FAILED_PROCESSING),
      entry(FileDeliveryMode.DERIVED_IMAGE_TEXT),
      entry(FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT),
      entry(FileDeliveryMode.NATIVE_AUDIO),
    ]);
    expect(counts).toEqual({
      extracted: 1,
      image: 1,
      skipped: 1,
      unsupported: 1,
      truncated: 1,
      transcript: 2,
      video: 1,
      processing: 1,
      failed: 1,
      described: 1,
      videoFrames: 1,
      audio: 1,
    });
  });

  it('never leaks counts between calls', () => {
    const first = countFileDeliveriesByMode([entry(FileDeliveryMode.TRANSCRIPT)]);
    const second = countFileDeliveriesByMode([]);
    expect(first.transcript).toBe(1);
    expect(second.transcript).toBe(0);
  });
});

describe('buildFileDeliveryBadges', () => {
  it('returns only non-zero badges, each with a text label', () => {
    const badges = buildFileDeliveryBadges(
      countFileDeliveriesByMode([
        entry(FileDeliveryMode.STILL_PROCESSING),
        entry(FileDeliveryMode.FAILED_PROCESSING),
      ]),
      identity,
    );
    expect(badges.map((badge) => [badge.countKey, badge.label, badge.count])).toEqual([
      ['processing', 'compare.delivery.stillProcessing', 1],
      ['failed', 'compare.delivery.failedProcessing', 1],
    ]);
  });
});

describe('readFileDeliveryFromMetadata', () => {
  const base = {
    fileId: 'f-9',
    filename: 'memo.m4a',
    mimeType: 'audio/mp4',
    provider: 'GEMINI',
    model: 'gemini-2.5-flash',
  };

  it('accepts the new modes', () => {
    const entries = readFileDeliveryFromMetadata({
      fileDelivery: [
        { ...base, mode: 'TRANSCRIPT' },
        { ...base, mode: 'NATIVE_VIDEO' },
        { ...base, mode: 'STILL_PROCESSING' },
        { ...base, mode: 'FAILED_PROCESSING', reason: 'decode failed' },
      ],
    });
    expect(entries?.map((item) => item.mode)).toEqual([
      FileDeliveryMode.TRANSCRIPT,
      FileDeliveryMode.NATIVE_VIDEO,
      FileDeliveryMode.STILL_PROCESSING,
      FileDeliveryMode.FAILED_PROCESSING,
    ]);
    expect(entries?.[3]?.reason).toBe('decode failed');
  });

  it('keeps the helper that described an image, and names it in the tooltip', () => {
    const entries = readFileDeliveryFromMetadata({
      fileDelivery: [
        {
          ...base,
          filename: 'shot.png',
          mimeType: 'image/png',
          provider: 'DEEPSEEK',
          model: 'deepseek-chat',
          mode: 'DERIVED_IMAGE_TEXT',
          helperProvider: 'GEMINI',
          helperModel: 'gemini-2.5-flash',
        },
      ],
    });
    expect(entries?.[0]).toEqual(
      expect.objectContaining({
        mode: FileDeliveryMode.DERIVED_IMAGE_TEXT,
        provider: 'DEEPSEEK',
        helperProvider: 'GEMINI',
        helperModel: 'gemini-2.5-flash',
      }),
    );
    expect(buildFileDeliveryTooltip(entries ?? [], identity)).toContain(
      'shot.png (compare.delivery.derivedImageText) — GEMINI/gemini-2.5-flash',
    );
  });

  it('still rejects garbage', () => {
    expect(readFileDeliveryFromMetadata(null)).toBeUndefined();
    expect(readFileDeliveryFromMetadata({ fileDelivery: 'nope' })).toBeUndefined();
    expect(
      readFileDeliveryFromMetadata({
        fileDelivery: [
          { ...base, mode: 'BOGUS' },
          { ...base, mode: 7 },
          { ...base, fileId: 1, mode: 'TRANSCRIPT' },
          null,
          'string',
        ],
      }),
    ).toBeUndefined();
  });
});
