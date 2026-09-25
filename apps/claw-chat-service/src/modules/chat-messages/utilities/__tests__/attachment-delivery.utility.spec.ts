// The resolver matrix behind ADR-120 / rule 42 item 14: one decision per file
// per lane, and that decision is both the payload flag and the record.

import { FileDeliveryMode } from '../../../../common/enums/file-delivery-mode.enum';
import { MediaCapabilityState } from '../../../../common/enums/media-capability-state.enum';
import { VideoFrameDelivery } from '../../../../common/enums/video-frame-delivery.enum';
import { VideoProcessingFailureReason } from '@claw/shared-types';
import { TEXT_BUDGET_SHORTENED_MARKER } from '../../constants/evidence-fit.constants';
import { MAX_FILE_CONTENT_LENGTH } from '../../constants/file-content.constants';
import type { FileContentResponse } from '../../types/context.types';
import type { ModelMediaCapabilities } from '../../types/model-capability.types';
import type { VideoPlanGate } from '../../types/attachment-delivery.types';
import {
  countDeliveryModes,
  isSentNatively,
  nativeImageContents,
  resolveAttachmentDelivery,
} from '../attachment-delivery.utility';

const { SUPPORTED, UNSUPPORTED, UNKNOWN } = MediaCapabilityState;

const PAID: VideoPlanGate = { available: true, limitSeconds: 600 };
const UNLIMITED: VideoPlanGate = { available: true, limitSeconds: null };

const caps = (
  vision: MediaCapabilityState,
  videoInput: MediaCapabilityState = UNKNOWN,
): ModelMediaCapabilities => ({ vision, audioInput: UNKNOWN, videoInput });

const file = (overrides: Partial<FileContentResponse>): FileContentResponse => ({
  id: 'f1',
  filename: 'x',
  mimeType: 'text/plain',
  content: 'aGVsbG8=',
  extractedText: 'hello',
  ingestionStatus: 'COMPLETED',
  extractionError: null,
  ...overrides,
});

const image = (overrides: Partial<FileContentResponse> = {}): FileContentResponse =>
  file({ id: 'img', filename: 'receipt.png', mimeType: 'image/png', ...overrides });

const one = (
  f: FileContentResponse,
  capabilities: ModelMediaCapabilities,
  provider = 'OPENAI',
  nativeVideoTransport = false,
  videoPlan?: VideoPlanGate,
) => {
  const [decision] = resolveAttachmentDelivery([f], capabilities, {
    provider,
    model: 'm',
    nativeVideoTransport,
    ...(videoPlan === undefined ? {} : { videoPlan }),
  });
  if (decision === undefined) {
    throw new Error('the resolver returned no decision for one file');
  }
  return decision;
};

describe('resolveAttachmentDelivery', () => {
  describe('images', () => {
    it('sends the bytes to a lane the catalog says can see', () => {
      expect(one(image(), caps(SUPPORTED))).toMatchObject({
        mode: FileDeliveryMode.NATIVE_IMAGE,
        sendNative: true,
      });
    });

    it('withholds the bytes from a lane the catalog says cannot see', () => {
      expect(one(image(), caps(UNSUPPORTED))).toMatchObject({
        mode: FileDeliveryMode.OMITTED_NO_VISION,
        sendNative: false,
        reason: 'file_delivery.reason.no_vision',
      });
    });

    it('lets the catalog override the provider list in both directions', () => {
      // OPENAI is in VISION_CAPABLE_PROVIDERS; the per-model answer still wins.
      expect(one(image(), caps(UNSUPPORTED), 'OPENAI').mode).toBe(
        FileDeliveryMode.OMITTED_NO_VISION,
      );
      // SOME_NEW_PROVIDER is not; a catalog SUPPORTED still sends the image.
      expect(one(image(), caps(SUPPORTED), 'SOME_NEW_PROVIDER').mode).toBe(
        FileDeliveryMode.NATIVE_IMAGE,
      );
    });

    it('falls back to the provider-level list when vision is UNKNOWN', () => {
      expect(one(image(), caps(UNKNOWN), 'ANTHROPIC').mode).toBe(FileDeliveryMode.NATIVE_IMAGE);
      expect(one(image(), caps(UNKNOWN), 'SOME_NEW_PROVIDER').mode).toBe(
        FileDeliveryMode.OMITTED_NO_VISION,
      );
    });

    it('records OCR-only delivery honestly when a vision lane has no bytes to send', () => {
      expect(one(image({ content: null }), caps(SUPPORTED))).toMatchObject({
        mode: FileDeliveryMode.EXTRACTED_TEXT,
        sendNative: false,
      });
      expect(
        one(image({ content: null, extractedText: '[Image file: receipt.png]' }), caps(SUPPORTED)),
      ).toMatchObject({ mode: FileDeliveryMode.OMITTED_UNSUPPORTED, sendNative: false });
    });
  });

  describe('audio', () => {
    const audio = (overrides: Partial<FileContentResponse>): FileContentResponse =>
      file({ id: 'a', filename: 'memo.webm', mimeType: 'audio/webm', ...overrides });

    it('records a finished transcript as TRANSCRIPT and never sends audio bytes', () => {
      expect(one(audio({ extractedText: 'call me tomorrow' }), caps(SUPPORTED))).toMatchObject({
        mode: FileDeliveryMode.TRANSCRIPT,
        sendNative: false,
      });
    });

    it('records the placeholder as STILL_PROCESSING', () => {
      expect(one(audio({ extractedText: '[Audio file: memo.webm]' }), caps(SUPPORTED)).mode).toBe(
        FileDeliveryMode.STILL_PROCESSING,
      );
    });

    it('records a transcription failure as FAILED_PROCESSING', () => {
      expect(
        one(
          audio({ extractedText: '[Audio file: memo.webm]', extractionError: 'provider refused' }),
          caps(SUPPORTED),
        ).mode,
      ).toBe(FileDeliveryMode.FAILED_PROCESSING);
    });
  });

  describe('video', () => {
    const video = file({
      id: 'v',
      filename: 'clip.mp4',
      mimeType: 'video/mp4',
      extractedText: '[Video file: clip.mp4]',
    });

    // Changed on purpose (plan-gate fix): a video still processing has no
    // measured duration, so it can never ride natively — not even to Gemini.
    it('never sends a still-processing video natively, even to a video model', () => {
      expect(one(video, caps(SUPPORTED, SUPPORTED), 'GEMINI', true, PAID)).toMatchObject({
        mode: FileDeliveryMode.STILL_PROCESSING,
        sendNative: false,
      });
    });

    // Multimodal batch 8 (behaviour changed on purpose): a lane that cannot
    // watch the video is no longer "OMITTED_UNSUPPORTED". Until the document
    // lands it is STILL_PROCESSING; once it exists, frames + transcript.
    it('is STILL_PROCESSING for a non-native lane while the document has not landed', () => {
      expect(one(video, caps(SUPPORTED, UNSUPPORTED), 'GEMINI', true)).toMatchObject({
        mode: FileDeliveryMode.STILL_PROCESSING,
        sendNative: false,
        reason: 'file_delivery.reason.still_processing',
      });
      expect(one(video, caps(SUPPORTED, SUPPORTED), 'OPENAI', false).sendNative).toBe(false);
    });

    const processed = file({
      id: 'v',
      filename: 'clip.mp4',
      mimeType: 'video/mp4',
      extractedText: 'Video "clip.mp4" — length 00:42.\n[00:00–00:05] hello',
      media: { durationMs: 42_000, width: 640, height: 360, hasAudio: true, failureReason: null },
    });

    it('is VIDEO_FRAMES_AND_TRANSCRIPT once the timestamped document exists', () => {
      expect(one(processed, caps(UNSUPPORTED, UNSUPPORTED), 'DEEPSEEK', false)).toMatchObject({
        mode: FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT,
        sendNative: false,
      });
      expect(one(processed, caps(SUPPORTED, UNSUPPORTED), 'GEMINI', true).mode).toBe(
        FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT,
      );
    });

    it('keeps a native lane native when the video is processed and inside the limits', () => {
      expect(one(processed, caps(SUPPORTED, SUPPORTED), 'GEMINI', true, PAID)).toMatchObject({
        mode: FileDeliveryMode.NATIVE_VIDEO,
        sendNative: true,
      });
      // Catalog down: the Gemini transport keeps its pre-ADR-120 behaviour.
      expect(one(processed, caps(UNKNOWN, UNKNOWN), 'GEMINI', true, PAID).mode).toBe(
        FileDeliveryMode.NATIVE_VIDEO,
      );
    });

    // The plan gate on native video (ADR-122): measured duration AND the
    // uploader's maxVideoSeconds, read for this turn; fails closed.
    describe('plan gate on native delivery', () => {
      const clipOf = (durationMs: number): FileContentResponse =>
        file({
          ...processed,
          media: { durationMs, width: 640, height: 360, hasAudio: true, failureReason: null },
        });
      const FREE: VideoPlanGate = { available: true, limitSeconds: 60 };

      it('never sends a 61 s video natively on a 60 s free plan', () => {
        expect(one(clipOf(61_000), caps(SUPPORTED, SUPPORTED), 'GEMINI', true, FREE)).toMatchObject(
          { mode: FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT, sendNative: false },
        );
        // 60.4 s is refused too, like file-service's own comparison.
        expect(one(clipOf(60_400), caps(SUPPORTED, SUPPORTED), 'GEMINI', true, FREE).mode).toBe(
          FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT,
        );
      });

      it('sends a 59 s video natively on a video-capable lane', () => {
        expect(one(clipOf(59_000), caps(SUPPORTED, SUPPORTED), 'GEMINI', true, FREE)).toMatchObject(
          { mode: FileDeliveryMode.NATIVE_VIDEO, sendNative: true },
        );
      });

      it('fails closed when entitlements are down: no bytes, the transcript path', () => {
        expect(
          one(clipOf(10_000), caps(SUPPORTED, SUPPORTED), 'GEMINI', true, {
            available: false,
            limitSeconds: null,
          }),
        ).toMatchObject({ mode: FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT, sendNative: false });
        // No plan answer supplied at all is the same.
        expect(one(clipOf(10_000), caps(SUPPORTED, SUPPORTED), 'GEMINI', true).mode).toBe(
          FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT,
        );
      });

      it('honours null = unlimited and 0 = disabled', () => {
        expect(
          one(clipOf(30 * 60_000), caps(SUPPORTED, SUPPORTED), 'GEMINI', true, {
            available: true,
            limitSeconds: null,
          }).mode,
        ).toBe(FileDeliveryMode.NATIVE_VIDEO);
        expect(
          one(clipOf(1_000), caps(SUPPORTED, SUPPORTED), 'GEMINI', true, {
            available: true,
            limitSeconds: 0,
          }).mode,
        ).toBe(FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT);
      });

      it('never sends a video with no measured duration natively', () => {
        const unmeasured = file({ ...processed, media: undefined });
        expect(one(unmeasured, caps(SUPPORTED, SUPPORTED), 'GEMINI', true, PAID).sendNative).toBe(
          false,
        );
      });
    });

    it('falls back to frames + transcript past the native (provider) duration limit', () => {
      const long = file({
        ...processed,
        media: {
          durationMs: 2 * 60 * 60_000,
          width: 640,
          height: 360,
          hasAudio: true,
          failureReason: null,
        },
      });
      expect(one(long, caps(SUPPORTED, SUPPORTED), 'GEMINI', true, UNLIMITED).mode).toBe(
        FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT,
      );
    });

    it.each(['VIDEO_TOO_LONG_FOR_PLAN', 'VIDEO_DISABLED_FOR_PLAN'] as const)(
      'refuses native delivery too when the plan refused the video (%s)',
      (failureReason) => {
        const refused = file({
          id: 'v',
          mimeType: 'video/mp4',
          extractedText: '[Video file: clip.mp4]',
          ingestionStatus: 'FAILED',
          extractionError: 'your plan processes videos up to 60 seconds',
          media: {
            durationMs: 90_000,
            width: null,
            height: null,
            hasAudio: null,
            failureReason: VideoProcessingFailureReason[failureReason],
          },
        });
        expect(one(refused, caps(SUPPORTED, SUPPORTED), 'GEMINI', true, PAID)).toMatchObject({
          mode: FileDeliveryMode.FAILED_PROCESSING,
          sendNative: false,
          reason: 'file_delivery.reason.video_plan_limit',
        });
      },
    );

    it('is FAILED_PROCESSING with the generic reason for any other failure', () => {
      const broken = file({
        id: 'v',
        mimeType: 'video/mp4',
        extractedText: '[Video file: clip.mp4]',
        ingestionStatus: 'FAILED',
        extractionError: 'The video could not be read.',
      });
      expect(one(broken, caps(UNSUPPORTED, UNSUPPORTED), 'OPENAI', false)).toMatchObject({
        mode: FileDeliveryMode.FAILED_PROCESSING,
        reason: 'file_delivery.reason.failed_processing',
      });
    });

    it('is OMITTED_UNSUPPORTED only for a row with no text and no status at all', () => {
      const legacy = file({
        id: 'v',
        mimeType: 'video/mp4',
        extractedText: null,
        ingestionStatus: undefined,
      });
      expect(one(legacy, caps(UNSUPPORTED, UNSUPPORTED), 'OPENAI', false)).toMatchObject({
        mode: FileDeliveryMode.OMITTED_UNSUPPORTED,
        reason: 'file_delivery.reason.no_video_input',
      });
    });
  });

  describe('text', () => {
    it('is EXTRACTED_TEXT when whole', () => {
      expect(one(file({}), caps(UNKNOWN)).mode).toBe(FileDeliveryMode.EXTRACTED_TEXT);
    });

    it('is TRUNCATED_TEXT when over the per-file limit or shortened to fit the window', () => {
      expect(
        one(file({ extractedText: 'x'.repeat(MAX_FILE_CONTENT_LENGTH + 1) }), caps(UNKNOWN)).mode,
      ).toBe(FileDeliveryMode.TRUNCATED_TEXT);
      expect(
        one(file({ extractedText: `abc${TEXT_BUDGET_SHORTENED_MARKER}` }), caps(UNKNOWN)).mode,
      ).toBe(FileDeliveryMode.TRUNCATED_TEXT);
    });

    it('tells "not yet" and "never" apart for a document with no text', () => {
      const pdf = { mimeType: 'application/pdf', extractedText: null };
      expect(one(file({ ...pdf, ingestionStatus: 'PROCESSING' }), caps(UNKNOWN)).mode).toBe(
        FileDeliveryMode.STILL_PROCESSING,
      );
      expect(one(file({ ...pdf, ingestionStatus: 'FAILED' }), caps(UNKNOWN)).mode).toBe(
        FileDeliveryMode.FAILED_PROCESSING,
      );
    });
  });

  it('resolves a mixed set per file, in order', () => {
    const decisions = resolveAttachmentDelivery(
      [
        file({ id: 'doc' }),
        image(),
        file({ id: 'a', mimeType: 'audio/mpeg', extractedText: 'hi' }),
        file({ id: 'v', mimeType: 'video/mp4', extractedText: '[Video file: v.mp4]' }),
        file({ id: 'font', mimeType: 'font/woff2' }),
      ],
      caps(UNSUPPORTED, UNSUPPORTED),
      { provider: 'DEEPSEEK', model: 'deepseek-chat', nativeVideoTransport: false },
    );

    expect(decisions.map((decision) => [decision.fileId, decision.mode])).toEqual([
      ['doc', FileDeliveryMode.EXTRACTED_TEXT],
      ['img', FileDeliveryMode.OMITTED_NO_VISION],
      ['a', FileDeliveryMode.TRANSCRIPT],
      ['v', FileDeliveryMode.STILL_PROCESSING],
      ['font', FileDeliveryMode.OMITTED_UNSUPPORTED],
    ]);
    expect(decisions.every((decision) => !decision.sendNative)).toBe(true);
    expect(countDeliveryModes(decisions)).toEqual({
      [FileDeliveryMode.EXTRACTED_TEXT]: 1,
      [FileDeliveryMode.OMITTED_NO_VISION]: 1,
      [FileDeliveryMode.TRANSCRIPT]: 1,
      [FileDeliveryMode.STILL_PROCESSING]: 1,
      [FileDeliveryMode.OMITTED_UNSUPPORTED]: 1,
    });
  });
});

describe('isSentNatively / nativeImageContents', () => {
  it('obeys the lane plan when there is one', () => {
    const img = image();
    const decisions = resolveAttachmentDelivery([img], caps(UNSUPPORTED), {
      provider: 'local-ollama',
      model: 'llama3.1:8b',
      nativeVideoTransport: false,
    });
    const context = {
      fileContents: [img],
      attachmentDelivery: { provider: 'local-ollama', model: 'llama3.1:8b', decisions },
    };

    expect(isSentNatively(context, img, false)).toBe(false);
    expect(nativeImageContents(context)).toEqual([]);
  });

  it("adds a seeing lane's native video frames to the images a local runtime receives", () => {
    const img = image();
    const context = {
      fileContents: [img],
      attachmentDelivery: {
        provider: 'local-ollama',
        model: 'llava:7b',
        decisions: [],
        videoFrames: [
          {
            fileId: 'v',
            filename: 'clip.mp4',
            timestampsMs: [1_000],
            frameDelivery: VideoFrameDelivery.NATIVE_IMAGES,
            frames: [{ timestampMs: 1_000, mimeType: 'image/jpeg', base64: 'RlJBTUU=' }],
            observations: [],
          },
          {
            fileId: 'w',
            filename: 'other.mp4',
            timestampsMs: [],
            frameDelivery: VideoFrameDelivery.NONE,
            frames: [],
            observations: [],
          },
        ],
      },
    };

    expect(nativeImageContents(context)).toEqual([img.content, 'RlJBTUU=']);
  });

  it('keeps the pre-ADR-120 behaviour with no plan: every image is sent', () => {
    const img = image();

    expect(isSentNatively({}, img, false)).toBe(true);
    expect(nativeImageContents({ fileContents: [img] })).toEqual([img.content]);
  });
});
