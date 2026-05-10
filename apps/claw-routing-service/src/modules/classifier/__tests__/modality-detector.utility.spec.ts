import { ModalityKind } from '../../../generated/prisma';
import { detectModalities } from '../utilities/modality-detector.utility';

describe('detectModalities', () => {
  it('plain text → TEXT in/out', () => {
    const result = detectModalities('hello');
    expect(result.modalityIn).toEqual([ModalityKind.TEXT]);
    expect(result.modalityOut).toEqual([ModalityKind.TEXT]);
    expect(result.modalityReasons).toEqual([]);
  });

  it('YouTube URL → YOUTUBE_INPUT, not WEB_INPUT', () => {
    const result = detectModalities('see https://youtu.be/abc');
    expect(result.modalityIn).toContain(ModalityKind.YOUTUBE_INPUT);
    expect(result.modalityIn).not.toContain(ModalityKind.WEB_INPUT);
  });

  it('arbitrary URL → WEB_INPUT', () => {
    const result = detectModalities('see https://example.com/article');
    expect(result.modalityIn).toContain(ModalityKind.WEB_INPUT);
  });

  it('PDF MIME → PDF_INPUT', () => {
    const result = detectModalities('summarize', ['application/pdf']);
    expect(result.modalityIn).toContain(ModalityKind.PDF_INPUT);
  });

  it('image MIME → IMAGE_INPUT', () => {
    const result = detectModalities('whats in this', ['image/jpeg']);
    expect(result.modalityIn).toContain(ModalityKind.IMAGE_INPUT);
  });

  it('audio MIME → AUDIO_INPUT', () => {
    const result = detectModalities('transcribe', ['audio/wav']);
    expect(result.modalityIn).toContain(ModalityKind.AUDIO_INPUT);
  });

  it('image generation intent → IMAGE_OUTPUT', () => {
    const result = detectModalities('generate an image of a robot');
    expect(result.modalityOut).toContain(ModalityKind.IMAGE_OUTPUT);
  });

  it('CSV intent → STRUCTURED_OUTPUT', () => {
    const result = detectModalities('produce a CSV table');
    expect(result.modalityOut).toContain(ModalityKind.STRUCTURED_OUTPUT);
  });

  it('unknown MIME → FILE_INPUT', () => {
    const result = detectModalities('process', ['application/zip']);
    expect(result.modalityIn).toContain(ModalityKind.FILE_INPUT);
  });
});
