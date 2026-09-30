// Multimodal batch 8 (rule 51 item 13): how one AUTO candidate fits the
// turn's attachments, and the message.created fields it is computed from.

import { RequiredModality } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { ModalityFit } from '../../../../common/enums/modality-fit.enum';
import { ModalityKind, RoutingMode } from '../../../../generated/prisma';
import { parseAttachmentModality } from '../attachment-modality.utility';
import {
  modalityFitOf,
  modalityFitReasonTag,
  rankDecisionByModalityFit,
} from '../modality-fit.utility';
import type { RoutingDecisionResult } from '../../types/routing.types';

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

describe('rankDecisionByModalityFit', () => {
  const catalog: Record<string, { modalitiesIn: ModalityKind[] }> = {
    'text-a': { modalitiesIn: [ModalityKind.TEXT] },
    'text-b': { modalitiesIn: [ModalityKind.TEXT] },
    vision: { modalitiesIn: [ModalityKind.TEXT, ModalityKind.IMAGE_INPUT] },
  };
  const decision: RoutingDecisionResult = {
    selectedProvider: 'P',
    selectedModel: 'text-a',
    routingMode: RoutingMode.AUTO,
    confidence: 0.7,
    reasonTags: ['auto', 'heuristic'],
    privacyClass: 'cloud',
    costClass: 'medium',
    fallbackChain: [
      { provider: 'P', model: 'text-b' },
      { provider: 'P', model: 'vision' },
    ],
  };
  const lookup = (entry: { model: string }) => catalog[entry.model];

  it('puts the capable model first and keeps the others in their order', () => {
    const ranking = rankDecisionByModalityFit(decision, lookup, [IMAGE_INPUT], [IMAGE_INPUT]);

    expect(ranking.decision.selectedModel).toBe('vision');
    expect(ranking.decision.fallbackChain.map((e) => e.model)).toEqual(['text-a', 'text-b']);
    expect(ranking.reordered).toBe(true);
    expect(ranking.originalFit).toBe(ModalityFit.TRANSFORMED);
    expect(ranking.fit).toBe(ModalityFit.DIRECT);
    expect(ranking.decision.reasonTags).toEqual([
      'auto',
      'heuristic',
      'modalityFit:direct',
      'modality_fit_reranked',
    ]);
  });

  it('keeps the pick when nothing fits better, and ranks unknown models as no modality', () => {
    const ranking = rankDecisionByModalityFit(
      { ...decision, fallbackChain: [{ provider: 'P', model: 'unknown' }] },
      lookup,
      [AUDIO_INPUT],
      [],
    );

    expect(ranking.reordered).toBe(false);
    expect(ranking.decision.selectedModel).toBe('text-a');
    expect(ranking.decision.reasonTags).toContain('modalityFit:degraded');
  });
});
