// The resolver matrix behind ADR-120 / rule 42 item 14: one decision per file
// per lane, and that decision is both the payload flag and the record.

import { FileDeliveryMode } from '../../../../common/enums/file-delivery-mode.enum';
import { MediaCapabilityState } from '../../../../common/enums/media-capability-state.enum';
import { TEXT_BUDGET_SHORTENED_MARKER } from '../../constants/evidence-fit.constants';
import { MAX_FILE_CONTENT_LENGTH } from '../../constants/file-content.constants';
import type { FileContentResponse } from '../../types/context.types';
import type { ModelMediaCapabilities } from '../../types/model-capability.types';
import {
  countDeliveryModes,
  isSentNatively,
  nativeImageContents,
  resolveAttachmentDelivery,
} from '../attachment-delivery.utility';

const { SUPPORTED, UNSUPPORTED, UNKNOWN } = MediaCapabilityState;

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
) => {
  const [decision] = resolveAttachmentDelivery([f], capabilities, {
    provider,
    model: 'm',
    nativeVideoTransport,
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

    it('is NATIVE_VIDEO only on a transport that carries video, for a model that accepts it', () => {
      expect(one(video, caps(SUPPORTED, SUPPORTED), 'GEMINI', true)).toMatchObject({
        mode: FileDeliveryMode.NATIVE_VIDEO,
        sendNative: true,
      });
      // Catalog down: the Gemini transport keeps its pre-ADR-120 behaviour.
      expect(one(video, caps(UNKNOWN, UNKNOWN), 'GEMINI', true).mode).toBe(
        FileDeliveryMode.NATIVE_VIDEO,
      );
    });

    it('is OMITTED_UNSUPPORTED for a model or transport that cannot take it', () => {
      expect(one(video, caps(SUPPORTED, UNSUPPORTED), 'GEMINI', true)).toMatchObject({
        mode: FileDeliveryMode.OMITTED_UNSUPPORTED,
        sendNative: false,
        reason: 'file_delivery.reason.no_video_input',
      });
      expect(one(video, caps(SUPPORTED, SUPPORTED), 'OPENAI', false).sendNative).toBe(false);
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
        file({ id: 'v', mimeType: 'video/mp4' }),
        file({ id: 'font', mimeType: 'font/woff2' }),
      ],
      caps(UNSUPPORTED, UNSUPPORTED),
      { provider: 'DEEPSEEK', model: 'deepseek-chat', nativeVideoTransport: false },
    );

    expect(decisions.map((decision) => [decision.fileId, decision.mode])).toEqual([
      ['doc', FileDeliveryMode.EXTRACTED_TEXT],
      ['img', FileDeliveryMode.OMITTED_NO_VISION],
      ['a', FileDeliveryMode.TRANSCRIPT],
      ['v', FileDeliveryMode.OMITTED_UNSUPPORTED],
      ['font', FileDeliveryMode.OMITTED_UNSUPPORTED],
    ]);
    expect(decisions.every((decision) => !decision.sendNative)).toBe(true);
    expect(countDeliveryModes(decisions)).toEqual({
      [FileDeliveryMode.EXTRACTED_TEXT]: 1,
      [FileDeliveryMode.OMITTED_NO_VISION]: 1,
      [FileDeliveryMode.TRANSCRIPT]: 1,
      [FileDeliveryMode.OMITTED_UNSUPPORTED]: 2,
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

  it('keeps the pre-ADR-120 behaviour with no plan: every image is sent', () => {
    const img = image();

    expect(isSentNatively({}, img, false)).toBe(true);
    expect(nativeImageContents({ fileContents: [img] })).toEqual([img.content]);
  });
});
