import { describe, expect, it } from 'vitest';
import { RoutingMode } from '../../../../generated/prisma';
import type { RoutingDecisionResult } from '../../types/routing.types';
import {
  buildTurnIntentPrompt,
  excerptTurnMessage,
  heuristicTurnIntentPayload,
  modelTurnIntentPayload,
  parsePreviousTurnKind,
  preferTurnIntentModels,
  turnIntentCacheKey,
  validateTurnIntentAnswer,
} from '../turn-intent.utility';

const decision = (selectedProvider: string, reasonTags: string[]): RoutingDecisionResult => ({
  selectedProvider,
  selectedModel: 'm',
  routingMode: RoutingMode.AUTO,
  confidence: 0.95,
  reasonTags,
  privacyClass: 'cloud',
  costClass: 'medium',
  fallbackChain: [],
});

describe('turn-intent utility', () => {
  it('keeps a short message whole and cuts a long one to head + tail', () => {
    expect(excerptTurnMessage('hello', 3, 3)).toBe('hello');
    expect(excerptTurnMessage('abcdefghij', 3, 3)).toBe('abc\n[... 4 characters omitted ...]\nhij');
  });

  it('names the turn facts in the prompt', () => {
    const prompt = buildTurnIntentPrompt({
      message: 'Hi',
      attachmentMimeTypes: ['image/png'],
      pickedModelKind: 'IMAGE',
    });
    expect(prompt).toContain('PREVIOUS_ASSISTANT_TURN_KIND: UNKNOWN');
    expect(prompt).toContain('ATTACHMENTS: image/png');
    expect(prompt).toContain('PICKED_MODEL_KIND: IMAGE');
  });

  it('validates the strict answer shape', () => {
    expect(validateTurnIntentAnswer('```json\n{"intent":"TEXT","confidence":0.8}\n```')).toEqual({
      valid: true,
      decision: { intent: 'TEXT', fileFormat: null, confidence: 0.8 },
    });
    expect(validateTurnIntentAnswer('{"intent":"TEXT","confidence":0.8,"extra":1}').valid).toBe(
      false,
    );
    expect(validateTurnIntentAnswer('no json').valid).toBe(false);
  });

  it('parses previousTurnKind from an untrusted payload', () => {
    expect(parsePreviousTurnKind('IMAGE')).toBe('IMAGE');
    expect(parsePreviousTurnKind('image')).toBeUndefined();
    expect(parsePreviousTurnKind(3)).toBeUndefined();
  });

  it('hashes the message out of the cache key', () => {
    const key = turnIntentCacheKey({ message: 'secret text', userId: 'u1' });
    expect(key).not.toContain('secret');
    expect(key).not.toBe(turnIntentCacheKey({ message: 'secret text', userId: 'u2' }));
  });

  it('publishes IMAGE_EDIT without an attached image as IMAGE_GENERATE; FILE keeps its format', () => {
    expect(
      modelTurnIntentPayload({ intent: 'IMAGE_EDIT', fileFormat: null, confidence: 0.9 }, false),
    ).toEqual({ kind: 'IMAGE_GENERATE', confidence: 0.9, source: 'MODEL' });
    expect(
      modelTurnIntentPayload({ intent: 'FILE', fileFormat: 'docx', confidence: 0.8 }, false),
    ).toEqual({ kind: 'FILE', fileFormat: 'docx', confidence: 0.8, source: 'MODEL' });
  });

  it('maps keyword decisions to HEURISTIC intents, and nothing else to none', () => {
    expect(heuristicTurnIntentPayload(decision('FILE_GENERATION', []))?.kind).toBe('FILE');
    expect(heuristicTurnIntentPayload(decision('IMAGE_OPENAI', ['image_edit']))?.kind).toBe(
      'IMAGE_EDIT',
    );
    expect(heuristicTurnIntentPayload(decision('IMAGE_GEMINI', ['image_generation']))?.kind).toBe(
      'IMAGE_GENERATE',
    );
    expect(heuristicTurnIntentPayload(decision('OPENAI', ['auto']))).toBeUndefined();
  });
});

describe('preferTurnIntentModels', () => {
  const entry = (order: number, providerModelId: string) =>
    ({
      entryId: `e${String(order)}`,
      order,
      provider: 'OLLAMA_CLOUD',
      providerModelId,
      deploymentId: `d${String(order)}`,
      attemptTimeoutMs: 1600,
      retries: 0,
      triggers: [],
    }) as unknown as Parameters<typeof preferTurnIntentModels>[0][number];

  it('moves the measured-best model first and renumbers the walk order', () => {
    const out = preferTurnIntentModels([
      entry(1, 'gpt-oss:120b'),
      entry(2, 'gemma4:31b'),
      entry(3, 'gpt-oss:20b'),
    ]);
    expect(out.map((e) => e.providerModelId)).toEqual([
      'gemma4:31b',
      'gpt-oss:120b',
      'gpt-oss:20b',
    ]);
    expect(out.map((e) => e.order)).toEqual([1, 2, 3]);
  });

  it('keeps the published order when no preferred model is published', () => {
    const out = preferTurnIntentModels([entry(1, 'a'), entry(2, 'b')]);
    expect(out.map((e) => e.providerModelId)).toEqual(['a', 'b']);
  });
});
