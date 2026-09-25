// Multimodal batch 8 (rule 51 item 13): how one AUTO candidate fits the
// turn's attachments, and the message.created fields it is computed from.

import { RequiredModality } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { ModalityFit } from '../../../../common/enums/modality-fit.enum';
import { ModalityKind } from '../../../../generated/prisma';
import { parseAttachmentModality } from '../attachment-modality.utility';
import { modalityFitOf, modalityFitReasonTag } from '../modality-fit.utility';

const { IMAGE_INPUT, VIDEO_INPUT, AUDIO_INPUT } = RequiredModality;

describe('modalityFitOf', () => {
  const textOnly = { modalitiesIn: [ModalityKind.TEXT] };
  const everything = {
    modalitiesIn: [
      ModalityKind.TEXT,
      ModalityKind.IMAGE_INPUT,
      ModalityKind.AUDIO_INPUT,
      ModalityKind.VIDEO_INPUT,
    ],
  };

  it.each([
    ['no attachments', textOnly, [], [], ModalityFit.DIRECT],
    [
      'reads all of them',
      everything,
      [IMAGE_INPUT, VIDEO_INPUT, AUDIO_INPUT],
      [],
      ModalityFit.DIRECT,
    ],
    [
      'video for a text model, transformable',
      textOnly,
      [VIDEO_INPUT],
      [VIDEO_INPUT],
      ModalityFit.TRANSFORMED,
    ],
    [
      'audio for a text model, transformable',
      textOnly,
      [AUDIO_INPUT],
      [AUDIO_INPUT],
      ModalityFit.TRANSFORMED,
    ],
    ['image without helper vision', textOnly, [IMAGE_INPUT], [], ModalityFit.DEGRADED],
    [
      'one of two not transformable',
      textOnly,
      [IMAGE_INPUT, VIDEO_INPUT],
      [VIDEO_INPUT],
      ModalityFit.DEGRADED,
    ],
    ['no modality data at all', {}, [VIDEO_INPUT], [VIDEO_INPUT], ModalityFit.TRANSFORMED],
  ] as const)('%s → %s', (_label, deployment, required, transformable, expected) => {
    expect(modalityFitOf(deployment, required, transformable)).toBe(expected);
  });

  it('lets the endpoint vision override win in both directions', () => {
    expect(modalityFitOf({ ...textOnly, supportsVision: true }, [IMAGE_INPUT], [])).toBe(
      ModalityFit.DIRECT,
    );
    expect(modalityFitOf({ ...everything, supportsVision: false }, [IMAGE_INPUT], [])).toBe(
      ModalityFit.DEGRADED,
    );
    expect(modalityFitOf({ ...everything, supportsVision: null }, [IMAGE_INPUT], [])).toBe(
      ModalityFit.DIRECT,
    );
  });

  it('names the tag the decision carries', () => {
    expect(modalityFitReasonTag(ModalityFit.TRANSFORMED)).toBe('modalityFit:transformed');
  });
});

describe('parseAttachmentModality', () => {
  it('reads what chat-service sent', () => {
    expect(
      parseAttachmentModality({
        attachmentMimeTypes: ['VIDEO/MP4', 'image/png'],
        requiredModalities: ['VIDEO_INPUT', 'IMAGE_INPUT'],
        transformableModalities: ['VIDEO_INPUT'],
      }),
    ).toEqual({
      attachmentMimeTypes: ['video/mp4', 'image/png'],
      requiredModalities: [VIDEO_INPUT, IMAGE_INPUT],
      transformableModalities: [VIDEO_INPUT],
    });
  });

  it('yields empty lists for an older publisher that sends none of it', () => {
    expect(parseAttachmentModality({ threadId: 't', content: 'hi' })).toEqual({
      attachmentMimeTypes: [],
      requiredModalities: [],
      transformableModalities: [],
    });
  });

  it('drops unknown values, non-strings, oversize entries, and transformables that are not required', () => {
    const parsed = parseAttachmentModality({
      attachmentMimeTypes: ['x'.repeat(300), 42, ...Array.from({ length: 20 }, () => 'image/png')],
      requiredModalities: ['VIDEO_INPUT', 'TELEPATHY', 7, 'VIDEO_INPUT'],
      transformableModalities: ['AUDIO_INPUT', 'VIDEO_INPUT'],
    });

    expect(parsed.attachmentMimeTypes).toHaveLength(10);
    expect(parsed.requiredModalities).toEqual([VIDEO_INPUT]);
    expect(parsed.transformableModalities).toEqual([VIDEO_INPUT]);
  });
});
