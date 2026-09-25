// Multimodal batch 8: the attachment half of message.created — what routing
// needs to rank AUTO candidates by modality fit (rule 51 item 13).

import { RequiredModality } from '@claw/shared-types';

import {
  RESEARCH_ATTACHMENT_DIGEST_MAX_CHARS,
  RESEARCH_ATTACHMENT_DIGEST_PER_FILE_CHARS,
} from '../../constants/attachment-modality.constants';
import type { FileContentResponse } from '../../types/context.types';
import {
  attachmentModalityFields,
  buildAttachmentDigest,
  requiredModalitiesForMimeTypes,
} from '../attachment-modality.utility';

const { IMAGE_INPUT, VIDEO_INPUT, AUDIO_INPUT } = RequiredModality;

describe('requiredModalitiesForMimeTypes', () => {
  it('maps image, video and audio mime types, deduped, in a stable order', () => {
    expect(
      requiredModalitiesForMimeTypes(['audio/webm', 'IMAGE/PNG', 'video/mp4', 'image/jpeg']),
    ).toEqual([IMAGE_INPUT, VIDEO_INPUT, AUDIO_INPUT]);
  });

  it('needs nothing for documents', () => {
    expect(requiredModalitiesForMimeTypes(['application/pdf', 'text/plain'])).toEqual([]);
  });
});

describe('attachmentModalityFields', () => {
  it('publishes nothing at all for a turn without attachments', () => {
    expect(attachmentModalityFields([], true)).toEqual({});
  });

  it('marks audio and video transformable always, an image only with helper vision', () => {
    expect(attachmentModalityFields(['video/mp4', 'image/png', 'audio/ogg'], false)).toEqual({
      attachmentMimeTypes: ['video/mp4', 'image/png', 'audio/ogg'],
      requiredModalities: [IMAGE_INPUT, VIDEO_INPUT, AUDIO_INPUT],
      transformableModalities: [VIDEO_INPUT, AUDIO_INPUT],
    });
    expect(attachmentModalityFields(['image/png'], true).transformableModalities).toEqual([
      IMAGE_INPUT,
    ]);
  });

  it('still sends the mime types of a document-only turn, with no required modality', () => {
    expect(attachmentModalityFields(['application/pdf'], false)).toEqual({
      attachmentMimeTypes: ['application/pdf'],
      requiredModalities: [],
      transformableModalities: [],
    });
  });
});

describe('buildAttachmentDigest', () => {
  const file = (overrides: Partial<FileContentResponse>): FileContentResponse => ({
    id: 'f',
    filename: 'clip.mp4',
    mimeType: 'video/mp4',
    content: null,
    extractedText: '',
    ...overrides,
  });

  it('quotes a transcript, bounded per file and overall, and skips placeholders', () => {
    const digest = buildAttachmentDigest([
      file({ extractedText: `[00:00–00:05]   Meet   Ada Lovelace. ${'x'.repeat(2_000)}` }),
      file({ filename: 'memo.webm', mimeType: 'audio/webm', extractedText: '[Audio file: memo]' }),
      file({ filename: 'b.mp4', extractedText: '[Video file: b.mp4]' }),
      file({ filename: 'shot.png', mimeType: 'image/png', extractedText: 'y'.repeat(2_000) }),
      file({ filename: 'third.png', mimeType: 'image/png', extractedText: 'z'.repeat(2_000) }),
    ]);

    expect(digest).toContain('"clip.mp4" (video/mp4): [00:00–00:05] Meet Ada Lovelace.');
    expect(digest).not.toContain('[Audio file');
    expect(digest).not.toContain('[Video file');
    expect(digest.split('\n')[0]?.length).toBeLessThan(
      RESEARCH_ATTACHMENT_DIGEST_PER_FILE_CHARS + 40,
    );
    expect(
      digest.replaceAll(/"[^"]+" \([^)]+\): /g, '').replaceAll('\n', '').length,
    ).toBeLessThanOrEqual(RESEARCH_ATTACHMENT_DIGEST_MAX_CHARS);
  });

  it('is empty when nothing has derived text yet', () => {
    expect(buildAttachmentDigest([file({ extractedText: null })])).toBe('');
  });
});
