// Rule 42 item 22 / rule 51 item 4: the window-fit and hold arithmetic behind
// native audio. Estimates size the fit and the hold; billing stays measured.

import { FileDeliveryMode } from '../../../../common/enums/file-delivery-mode.enum';
import type { AttachmentDeliveryDecision } from '../../types/attachment-delivery.types';
import type { FileContentResponse } from '../../types/context.types';
import { fallbackModelTokenBudget } from '../assembled-context.utility';
import {
  estimateNativeAudioTokens,
  hasNativeAudioDelivery,
  nativeAudioTokenBudget,
  nativeAudioTokenEstimate,
  nativeMediaTokenEstimate,
  nativeVideoTokenEstimate,
  payloadMediaType,
} from '../native-audio.utility';

/** base64 of `bytes` decoded bytes (4 chars carry 3 bytes). */
const base64Of = (bytes: number): string => 'A'.repeat(Math.ceil((bytes * 4) / 3));

const memo = (id: string, bytes: number): FileContentResponse => ({
  id,
  filename: `${id}.webm`,
  mimeType: 'audio/webm',
  content: base64Of(bytes),
  extractedText: 'hi',
  ingestionStatus: 'COMPLETED',
  extractionError: null,
});

const decision = (
  fileId: string,
  mode: FileDeliveryMode,
  sendNative: boolean,
): AttachmentDeliveryDecision => ({
  fileId,
  filename: fileId,
  mimeType: 'audio/webm',
  provider: 'GEMINI',
  model: 'gemini-2.5-flash',
  mode,
  sendNative,
});

describe('native audio arithmetic', () => {
  it('estimates 32 tokens per second at 2,000 bytes per second, rounded up', () => {
    // 60 s of 16 kbps audio = 120,000 bytes → 1,920 tokens.
    expect(estimateNativeAudioTokens(memo('a', 120_000))).toBe(1_920);
    expect(estimateNativeAudioTokens(memo('a', 2_001))).toBe(64);
    expect(estimateNativeAudioTokens({ content: null })).toBe(0);
  });

  it('gives audio half the file share of the input window', () => {
    // (1,000,000 − 8,000) × 0.25 × 0.5
    const base = fallbackModelTokenBudget();
    expect(
      nativeAudioTokenBudget({
        ...base,
        contextWindowTokens: 1_000_000,
        reservedOutputTokens: 8_000,
      }),
    ).toBe(124_000);
    expect(
      nativeAudioTokenBudget({ ...base, contextWindowTokens: 100, reservedOutputTokens: 500 }),
    ).toBe(0);
  });

  it('sums only the recordings that really ride natively (the hold covers them)', () => {
    const context = {
      fileContents: [memo('native', 120_000), memo('text', 120_000)],
      attachmentDelivery: {
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        decisions: [
          decision('native', FileDeliveryMode.NATIVE_AUDIO, true),
          decision('text', FileDeliveryMode.TRANSCRIPT, false),
        ],
      },
    };

    expect(nativeAudioTokenEstimate(context)).toBe(1_920);
    expect(hasNativeAudioDelivery(context)).toBe(true);
    expect(nativeAudioTokenEstimate({ fileContents: context.fileContents })).toBe(0);
    expect(hasNativeAudioDelivery({})).toBe(false);
  });

  it('estimates native video from its measured duration and adds it to the audio', () => {
    const clip: FileContentResponse = {
      ...memo('clip', 0),
      mimeType: 'video/mp4',
      media: { durationMs: 4_200, width: null, height: null, hasAudio: true, failureReason: null },
    };
    const context = {
      fileContents: [memo('native', 120_000), clip],
      attachmentDelivery: {
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        decisions: [
          decision('native', FileDeliveryMode.NATIVE_AUDIO, true),
          decision('clip', FileDeliveryMode.NATIVE_VIDEO, true),
        ],
      },
    };

    // ceil(4.2 s) × 300 tokens/s.
    expect(nativeVideoTokenEstimate(context)).toBe(1_500);
    expect(nativeMediaTokenEstimate(context)).toBe(1_920 + 1_500);
    expect(nativeVideoTokenEstimate({ fileContents: [clip] })).toBe(0);
  });

  it('strips media-type parameters for the data URL', () => {
    expect(payloadMediaType('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(payloadMediaType('image/png')).toBe('image/png');
  });
});
