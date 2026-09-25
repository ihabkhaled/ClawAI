import { describe, expect, it } from 'vitest';
import { RequiredModality } from '@claw/shared-types';
import { ModalityFit } from '../../../../common/enums/modality-fit.enum';
import { ModalityKind, RouterProvider } from '../../../../generated/prisma';
import { modelMatchKey, selectCloudRouterCandidates } from '../cloud-router-candidates.utility';

const row = (
  id: string,
  provider: RouterProvider,
  model: string,
  state = 'REQUIRES_VALIDATION',
) => ({
  id,
  provider,
  providerModelId: model,
  activationState: state,
});

describe('modelMatchKey', () => {
  it.each([
    ['GEMINI', 'models/gemini-3.6-flash', 'GEMINI/gemini-3.6-flash'],
    ['gemini', 'gemini-3.6-flash', 'GEMINI/gemini-3.6-flash'],
    ['OLLAMA', 'glm-5.2:cloud', 'OLLAMA/glm-5.2'],
    ['OPENAI', ' GPT-5.5 ', 'OPENAI/gpt-5.5'],
  ])('%s + %s -> %s', (provider, model, expected) => {
    expect(modelMatchKey(provider, model)).toBe(expected);
  });
});

describe('selectCloudRouterCandidates', () => {
  const unfiltered = { allowed: null, connectorHealth: {} };

  // 20 Gemini models must not crowd out the other providers.
  it('takes one model per provider in turn up to the cap', () => {
    const rows = [
      ...Array.from({ length: 20 }, (_, i) =>
        row(`g${String(i)}`, RouterProvider.GEMINI, `gemini-${String(i)}`),
      ),
      row('a1', RouterProvider.ANTHROPIC, 'claude-sonnet-5'),
      row('o1', RouterProvider.OPENAI, 'gpt-5.5'),
    ];
    const exposed = new Set(rows.map((r) => modelMatchKey(r.provider, r.providerModelId)));

    const result = selectCloudRouterCandidates(rows, { ...unfiltered, exposed, max: 3 });

    expect(result.map((r) => r.provider).sort()).toEqual(['ANTHROPIC', 'GEMINI', 'OPENAI']);
  });

  it('puts proven (ACTIVE) models before unvalidated ones of the same provider', () => {
    const rows = [
      row('new', RouterProvider.GEMINI, 'gemini-a'),
      row('proven', RouterProvider.GEMINI, 'gemini-b', 'ACTIVE'),
    ];
    const exposed = new Set(rows.map((r) => modelMatchKey(r.provider, r.providerModelId)));

    const result = selectCloudRouterCandidates(rows, { ...unfiltered, exposed, max: 1 });

    expect(result[0]?.id).toBe('proven');
  });

  it('matches a plan key written with the Gemini models/ prefix', () => {
    const rows = [row('g', RouterProvider.GEMINI, 'gemini-3.6-flash')];
    const exposed = new Set(['GEMINI/gemini-3.6-flash']);

    const result = selectCloudRouterCandidates(rows, {
      exposed,
      allowed: new Set([modelMatchKey('GEMINI', 'models/gemini-3.6-flash')]),
      connectorHealth: {},
      max: 5,
    });

    expect(result).toHaveLength(1);
  });

  it('treats an unknown connector health as usable', () => {
    const rows = [row('a', RouterProvider.ANTHROPIC, 'claude-sonnet-5')];
    const exposed = new Set(['ANTHROPIC/claude-sonnet-5']);

    expect(
      selectCloudRouterCandidates(rows, { exposed, allowed: null, connectorHealth: {}, max: 5 }),
    ).toHaveLength(1);
  });
});

// Multimodal batch 8 (rule 51 item 13): with attachments, AUTO ranks by
// modality fit — direct readers first, transformable text-only models still
// eligible, models that could not be served properly only as a last resort.
// Exposure, health and plan filters are applied first and never relaxed.
describe('selectCloudRouterCandidates — modality fit', () => {
  const { IMAGE_INPUT, VIDEO_INPUT, AUDIO_INPUT } = RequiredModality;
  const modal = (
    id: string,
    provider: RouterProvider,
    model: string,
    modalitiesIn: ModalityKind[],
    state = 'REQUIRES_VALIDATION',
  ) => ({ ...row(id, provider, model, state), modalitiesIn });

  const TEXT_ONLY = modal(
    'ds',
    RouterProvider.DEEPSEEK,
    'deepseek-chat',
    [ModalityKind.TEXT],
    'ACTIVE',
  );
  const VISION = modal('gpt', RouterProvider.OPENAI, 'gpt-4o', [
    ModalityKind.TEXT,
    ModalityKind.IMAGE_INPUT,
  ]);
  const VIDEO = modal('gem', RouterProvider.GEMINI, 'gemini-2.5-flash', [
    ModalityKind.TEXT,
    ModalityKind.IMAGE_INPUT,
    ModalityKind.AUDIO_INPUT,
    ModalityKind.VIDEO_INPUT,
  ]);
  const rows = [TEXT_ONLY, VISION, VIDEO];
  const exposed = new Set(rows.map((r) => modelMatchKey(r.provider, r.providerModelId)));
  const base = { allowed: null, connectorHealth: {}, exposed, max: 10 };

  it('leaves the order exactly as before when nothing is attached', () => {
    const before = selectCloudRouterCandidates(rows, base);
    const after = selectCloudRouterCandidates(rows, {
      ...base,
      requiredModalities: [],
      transformableModalities: [],
    });

    expect(after).toEqual(before);
    expect(after.every((entry) => entry.modalityFit === undefined)).toBe(true);
  });

  it('ranks a vision model first for an image, and keeps text-only only when helper vision can transform it', () => {
    const withHelper = selectCloudRouterCandidates(rows, {
      ...base,
      requiredModalities: [IMAGE_INPUT],
      transformableModalities: [IMAGE_INPUT],
    });
    const withoutHelper = selectCloudRouterCandidates(rows, {
      ...base,
      requiredModalities: [IMAGE_INPUT],
      transformableModalities: [],
    });

    expect(withHelper.map((entry) => [entry.id, entry.modalityFit])).toEqual([
      ['gpt', ModalityFit.DIRECT],
      ['gem', ModalityFit.DIRECT],
      ['ds', ModalityFit.TRANSFORMED],
    ]);
    expect(withoutHelper.map((entry) => entry.id)).not.toContain('ds');
  });

  it('ranks a video-capable model first, and keeps text-only models eligible (frames + transcript)', () => {
    const result = selectCloudRouterCandidates(rows, {
      ...base,
      requiredModalities: [VIDEO_INPUT],
      transformableModalities: [VIDEO_INPUT],
    });

    expect(result[0]).toMatchObject({ id: 'gem', modalityFit: ModalityFit.DIRECT });
    expect(result.slice(1).map((entry) => entry.modalityFit)).toEqual([
      ModalityFit.TRANSFORMED,
      ModalityFit.TRANSFORMED,
    ]);
    expect(result.map((entry) => entry.id).sort()).toEqual(['ds', 'gem', 'gpt']);
  });

  it('lets the endpoint vision override beat the definition', () => {
    const blindEndpoint = { ...VISION, supportsVision: false };
    const result = selectCloudRouterCandidates([blindEndpoint, VIDEO], {
      ...base,
      requiredModalities: [IMAGE_INPUT],
      transformableModalities: [],
    });

    expect(result.map((entry) => entry.id)).toEqual(['gem']);
  });

  it('never goes dark: with no direct or transformable model, the degraded ones stay, tagged', () => {
    const result = selectCloudRouterCandidates([TEXT_ONLY], {
      ...base,
      requiredModalities: [IMAGE_INPUT, AUDIO_INPUT],
      transformableModalities: [AUDIO_INPUT],
    });

    expect(result).toEqual([
      {
        id: 'ds',
        provider: RouterProvider.DEEPSEEK,
        providerModelId: 'deepseek-chat',
        modalityFit: ModalityFit.DEGRADED,
      },
    ]);
  });

  it('keeps exposure, health and plan filters exactly as they were', () => {
    const result = selectCloudRouterCandidates(rows, {
      exposed: new Set([
        modelMatchKey(TEXT_ONLY.provider, TEXT_ONLY.providerModelId),
        'GEMINI/gemini-2.5-flash',
      ]),
      allowed: new Set(['DEEPSEEK/deepseek-chat', 'GEMINI/gemini-2.5-flash', 'OPENAI/gpt-4o']),
      connectorHealth: { GEMINI: false },
      max: 10,
      requiredModalities: [VIDEO_INPUT],
      transformableModalities: [VIDEO_INPUT],
    });

    // The video model is unhealthy and the vision model unexposed: only the
    // text-only model is left, and it is still offered (frames + transcript).
    expect(result.map((entry) => [entry.id, entry.modalityFit])).toEqual([
      ['ds', ModalityFit.TRANSFORMED],
    ]);
  });

  it('respects the cap across tiers', () => {
    const result = selectCloudRouterCandidates(rows, {
      ...base,
      max: 2,
      requiredModalities: [VIDEO_INPUT],
      transformableModalities: [VIDEO_INPUT],
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe('gem');
  });
});
