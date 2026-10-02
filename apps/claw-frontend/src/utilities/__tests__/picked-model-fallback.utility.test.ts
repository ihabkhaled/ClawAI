import { describe, expect, it, vi } from 'vitest';

import { RoutingMode } from '@/enums';
import type { ModelPickerGroup, StreamEvent, TranslateFunction } from '@/types';
import {
  resolveChatStreamError,
  resolveStoredErrorMessage,
} from '@/utilities/chat-stream-error.utility';
import { encodeModelValue } from '@/utilities/model-selector.utility';
import {
  chooseRecoverySuggestions,
  offersPickedModelRecovery,
  readPickedModelFallback,
  readSuggestedModels,
} from '@/utilities/picked-model-fallback.utility';

const group = (...models: Array<[string, string, string]>): ModelPickerGroup => ({
  key: 'g',
  label: 'g',
  options: models.map(([provider, model, label]) => ({
    value: encodeModelValue(provider, model),
    label,
  })),
});

describe('readPickedModelFallback', () => {
  it('reads the notice a substitute answer carries', () => {
    expect(
      readPickedModelFallback({
        pickedModelFallback: {
          originalProvider: 'ANTHROPIC',
          originalModel: 'claude-opus-5',
          costlier: false,
        },
      }),
    ).toEqual({ originalProvider: 'ANTHROPIC', originalModel: 'claude-opus-5', costlier: false });
  });

  it('treats a missing costlier flag as costlier, and malformed data as no notice', () => {
    expect(
      readPickedModelFallback({
        pickedModelFallback: { originalProvider: 'A', originalModel: 'b' },
      })?.costlier,
    ).toBe(true);
    expect(readPickedModelFallback({ pickedModelFallback: { originalProvider: 'A' } })).toBeNull();
    expect(readPickedModelFallback(null)).toBeNull();
    expect(readPickedModelFallback({})).toBeNull();
  });
});

describe('readSuggestedModels', () => {
  it('keeps valid pairs, drops junk and caps at three', () => {
    const result = readSuggestedModels({
      suggestedModels: [
        { provider: 'GROQ', model: 'a' },
        { provider: 'GROQ' },
        'x',
        { provider: 'GEMINI', model: 'b' },
        { provider: 'OPENAI', model: 'c' },
        { provider: 'OLLAMA', model: 'd' },
      ],
    });
    expect(result.map((entry) => entry.model)).toEqual(['a', 'b', 'c']);
  });

  it('is empty when absent', () => {
    expect(readSuggestedModels(null)).toEqual([]);
    expect(readSuggestedModels({ suggestedModels: 'nope' })).toEqual([]);
  });
});

describe('offersPickedModelRecovery', () => {
  it('is true for the all-failed code on any routing mode', () => {
    expect(
      offersPickedModelRecovery(
        { error: true, errorCode: 'PICKED_MODEL_FAILED' },
        RoutingMode.AUTO,
      ),
    ).toBe(true);
  });

  it('is true for a provider failure on a picked model only', () => {
    const metadata = { error: true, errorCode: 'LLM_EXECUTION_FAILED' };
    expect(offersPickedModelRecovery(metadata, RoutingMode.MANUAL_MODEL)).toBe(true);
    expect(offersPickedModelRecovery(metadata, RoutingMode.AUTO)).toBe(false);
  });

  it('is false for credit and plan refusals, and for a normal answer', () => {
    expect(
      offersPickedModelRecovery(
        { error: true, errorCode: 'PAYG_CREDIT_EXHAUSTED' },
        RoutingMode.MANUAL_MODEL,
      ),
    ).toBe(false);
    expect(
      offersPickedModelRecovery(
        { error: true, errorCode: 'MODEL_NOT_ALLOWED' },
        RoutingMode.MANUAL_MODEL,
      ),
    ).toBe(false);
    expect(offersPickedModelRecovery({}, RoutingMode.MANUAL_MODEL)).toBe(false);
    expect(offersPickedModelRecovery(null, RoutingMode.MANUAL_MODEL)).toBe(false);
  });
});

describe('chooseRecoverySuggestions', () => {
  const groups = [
    group(
      ['ANTHROPIC', 'claude-opus-5', 'Claude Opus 5'],
      ['GROQ', 'llama-4', 'Llama 4'],
      ['GEMINI', 'gemini-flash', 'Gemini Flash'],
      ['OPENAI', 'gpt-5', 'GPT 5'],
      ['OLLAMA', 'glm', 'GLM'],
    ),
  ];

  it('prefers the backend list and labels it from the picker', () => {
    const result = chooseRecoverySuggestions([{ provider: 'GROQ', model: 'llama-4' }], groups, {
      provider: 'ANTHROPIC',
      model: 'claude-opus-5',
    });
    expect(result).toEqual([{ provider: 'GROQ', model: 'llama-4', label: 'Llama 4' }]);
  });

  it('falls back to the picker models (minus the failed one), three at most', () => {
    const result = chooseRecoverySuggestions([], groups, {
      provider: 'ANTHROPIC',
      model: 'claude-opus-5',
    });
    expect(result.map((entry) => entry.model)).toEqual(['llama-4', 'gemini-flash', 'gpt-5']);
  });

  it('never offers a speech, video or image model from the picker', () => {
    const result = chooseRecoverySuggestions(
      [],
      [
        group(
          ['GEMINI', 'models/gemini-2.5-flash-preview-tts', 'TTS'],
          ['GEMINI', 'models/veo-3.1-fast-generate-preview', 'Veo'],
          ['OPENAI', 'gpt-image-1', 'Image'],
          ['GROQ', 'llama-4', 'Llama 4'],
        ),
      ],
      null,
    );
    expect(result.map((entry) => entry.model)).toEqual(['llama-4']);
  });

  it('uses the model id when the picker does not know the model', () => {
    const result = chooseRecoverySuggestions([{ provider: 'X', model: 'mystery' }], [], null);
    expect(result).toEqual([{ provider: 'X', model: 'mystery', label: 'mystery' }]);
  });
});

describe('the all-failed reply is translated, not "All providers failed"', () => {
  const translate = vi.fn<TranslateFunction>((key) => `localized:${key}`);

  it('maps the live stream error by code and by message key', () => {
    expect(resolveChatStreamError({ code: 'PICKED_MODEL_FAILED' } as StreamEvent, translate)).toBe(
      'localized:pickedModel.failedMessage',
    );
    expect(
      resolveChatStreamError({ messageKey: 'pickedModel.failedMessage' } as StreamEvent, translate),
    ).toBe('localized:pickedModel.failedMessage');
  });

  it('translates the stored error reply after a reload', () => {
    expect(
      resolveStoredErrorMessage(
        {
          error: true,
          errorCode: 'PICKED_MODEL_FAILED',
          errorMessageKey: 'pickedModel.failedMessage',
        },
        translate,
      ),
    ).toBe('⚠️ localized:pickedModel.failedMessage');
  });
});
