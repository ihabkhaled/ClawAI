import { describe, expect, it } from 'vitest';
import { NamedModelCapability } from '../../../../common/enums/named-model-capability.enum';
import type {
  NamedModelCandidate,
  NamedModelCatalogEntry,
} from '../../types/named-model-request.types';
import {
  findNamedModelRequest,
  hasModelDirective,
  namedModelCapabilityOf,
  namedModelUnavailableReason,
  resolveNamedModel,
  stripNamedModelDirective,
} from '../named-model-request.utility';

const model = (
  provider: string,
  providerModelId: string,
  isActive = true,
): NamedModelCandidate => ({
  provider,
  providerModelId,
  isActive,
});

const CATALOG: NamedModelCandidate[] = [
  model('GEMINI', 'models/gemini-2.5-flash'),
  model('GEMINI', 'models/gemini-2.5-pro'),
  model('GEMINI', 'models/gemini-2.5-flash-image'),
  model('GEMINI', 'models/gemini-3-pro-image-preview', false),
  model('GEMINI', 'models/veo-3.1-fast-generate-preview'),
  model('GROK', 'grok-3-mini'),
  model('GROK', 'grok-4'),
  model('GROK', 'grok-imagine-image'),
  model('GROK', 'grok-imagine-video'),
  model('OPENAI', 'gpt-4o'),
  model('OPENAI', 'gpt-4o-mini'),
  model('OPENAI', 'gpt-image-1'),
  model('ANTHROPIC', 'claude-sonnet-4-20250514'),
  model('ANTHROPIC', 'claude-opus-4'),
];

const route = (
  message: string,
  wanted: NamedModelCapability = NamedModelCapability.CHAT,
  catalog: NamedModelCandidate[] = CATALOG,
): string | null => {
  const match = findNamedModelRequest(message, catalog);
  if (match === null) return null;
  const resolution = resolveNamedModel(match, catalog, wanted);
  return resolution === null ? null : `${resolution.provider}/${resolution.model}`;
};

describe('findNamedModelRequest + resolveNamedModel', () => {
  it('"use nano banana to make X" resolves to the Gemini flash image model from the catalog', () => {
    expect(
      route('use nano banana to make a poster of a lighthouse', NamedModelCapability.IMAGE),
    ).toBe('GEMINI/models/gemini-2.5-flash-image');
  });

  it('"nano banana pro" resolves to the pro image model, not the flash one', () => {
    expect(route('Please use Nano Banana Pro for a product shot', NamedModelCapability.IMAGE)).toBe(
      'GEMINI/models/gemini-3-pro-image-preview',
    );
  });

  it('a nano banana request is honoured even when the words do not read as an image request', () => {
    expect(route('use nano banana for the cover of my book')).toBe(
      'GEMINI/models/gemini-2.5-flash-image',
    );
  });

  it('resolves the catalog model by its own id, with or without a date stamp', () => {
    expect(route('use gpt-4o-mini to summarise this')).toBe('OPENAI/gpt-4o-mini');
    expect(route('with claude sonnet 4 please rewrite this email')).toBe(
      'ANTHROPIC/claude-sonnet-4-20250514',
    );
    expect(route('ask Gemini 2.5 Pro to review the plan')).toBe('GEMINI/models/gemini-2.5-pro');
  });

  it('prefers the longest name: "gpt-4o-mini" is not "gpt-4o"', () => {
    expect(route('use gpt 4o mini for this')).toBe('OPENAI/gpt-4o-mini');
    expect(route('use gpt-4o for this')).toBe('OPENAI/gpt-4o');
  });

  it('"use grok" picks a Grok chat model, the provider default first', () => {
    expect(route('use grok to explain recursion')).toBe('GROK/grok-3-mini');
  });

  it('"use grok" for a picture request picks the Grok image model, for a video request the video model', () => {
    expect(route('use grok to draw a cat', NamedModelCapability.IMAGE)).toBe(
      'GROK/grok-imagine-image',
    );
    expect(route('use grok to make a video of a cat', NamedModelCapability.VIDEO)).toBe(
      'GROK/grok-imagine-video',
    );
  });

  it('"veo" resolves to the catalog Veo model', () => {
    expect(route('with veo make a 5 second clip of the sea', NamedModelCapability.VIDEO)).toBe(
      'GEMINI/models/veo-3.1-fast-generate-preview',
    );
  });

  it('understands "@name"', () => {
    expect(route('@claude opus 4 review this diff')).toBe('ANTHROPIC/claude-opus-4');
  });

  it('only routes to models the catalog (already filtered by health and plan) holds', () => {
    const noGemini = CATALOG.filter((entry) => entry.provider !== 'GEMINI');
    expect(
      route('use nano banana to make a poster', NamedModelCapability.IMAGE, noGemini),
    ).toBeNull();
    expect(route('use claude to review this', NamedModelCapability.CHAT, noGemini)).toBe(
      'ANTHROPIC/claude-sonnet-4-20250514',
    );
  });

  it('a named chat model is not asked for a picture; normal routing handles that', () => {
    expect(route('use gpt-4o to draw a cat', NamedModelCapability.IMAGE)).toBeNull();
  });

  it('a provider with no fitting model returns null', () => {
    expect(route('use claude to draw a cat', NamedModelCapability.IMAGE)).toBeNull();
  });

  it.each([
    'what is Grok?',
    'Grok is a verb meaning to understand',
    'compare Gemini with Claude for coding',
    'Gemini vs GPT-4o, which is better?',
    'is Claude better than Gemini?',
    'do not use grok for this',
    "don't use nano banana, draw it yourself",
    'my friend uses nano banana a lot',
    'explain how veo works',
    'write a post about how I use claude every day',
    'use the stairs, not the lift',
    'use of gemini in schools',
  ])('"%s" names no model', (message) => {
    expect(route(message, NamedModelCapability.IMAGE)).toBeNull();
    expect(route(message)).toBeNull();
  });

  it('ignores a model name inside a pasted document body', () => {
    const pasted = `Use this brief to write the summary.\n\n${'Notes about the market. '.repeat(
      80,
    )}\n\nWe will use grok internally for triage.\n\n${'More notes follow here. '.repeat(40)}`;
    expect(route(pasted)).toBeNull();
  });
});

describe('hasModelDirective', () => {
  it.each([
    ['use nano banana', true],
    ['ask grok', true],
    ['@veo a sunset', true],
    ['please try gemini', true],
    ['hello there', false],
    ['the nano banana is a fruit', false],
  ])('"%s" → %s', (message, expected) => {
    expect(hasModelDirective(message)).toBe(expected);
  });
});

describe('namedModelCapabilityOf', () => {
  it.each([
    ['GEMINI', 'models/gemini-2.5-flash-image', NamedModelCapability.IMAGE],
    ['GROK', 'grok-imagine-video', NamedModelCapability.VIDEO],
    ['OPENAI', 'gpt-4o', NamedModelCapability.CHAT],
  ])('%s/%s → %s', (provider, id, expected) => {
    expect(namedModelCapabilityOf(model(provider, id))).toBe(expected);
  });
});

describe('stripNamedModelDirective', () => {
  it.each([
    ['use nano banana to make a poster of cats', 'nano banana', 'Make a poster of cats'],
    ['Use Nano-Banana: a red fox in snow', 'nano banana', 'A red fox in snow'],
    ['ask grok about relativity', 'grok', 'Tell me about relativity'],
    ['ask grok to explain recursion', 'grok', 'Explain recursion'],
    ['Draw a cat with nano banana', 'nano banana', 'Draw a cat'],
    ['@veo a sunset over the sea', 'veo', 'A sunset over the sea'],
    ['I want you to use claude to write a poem', 'claude', 'I want you to write a poem'],
    ['try gpt-4o-mini: summarise this', 'gpt 4o mini', 'Summarise this'],
  ])('"%s" → "%s"', (message, phrase, expected) => {
    expect(stripNamedModelDirective(message, phrase)).toBe(expected);
  });

  it('is null when nothing would be left, or the phrase is not in the message', () => {
    expect(stripNamedModelDirective('use grok', 'grok')).toBeNull();
    expect(stripNamedModelDirective('write a poem', 'grok')).toBeNull();
  });
});

describe('namedModelUnavailableReason', () => {
  const entry = (
    provider: string,
    providerModelId: string,
    allowed: boolean,
    healthy: boolean,
  ): NamedModelCatalogEntry => ({ provider, providerModelId, isActive: true, allowed, healthy });
  const grok = { phrase: 'grok', provider: 'GROK', model: null, modelPattern: null };

  it('NOT_CONFIGURED when the provider has no deployment at all', () => {
    expect(
      namedModelUnavailableReason(
        grok,
        [entry('OPENAI', 'gpt-4o', true, true)],
        NamedModelCapability.CHAT,
      ),
    ).toBe('NOT_CONFIGURED');
  });

  it('NOT_IN_PLAN when the fitting model exists but the plan excludes it', () => {
    expect(
      namedModelUnavailableReason(
        grok,
        [entry('GROK', 'grok-3-mini', false, true)],
        NamedModelCapability.CHAT,
      ),
    ).toBe('NOT_IN_PLAN');
  });

  it('CONNECTOR_DOWN when the fitting model is allowed but its connector is down', () => {
    expect(
      namedModelUnavailableReason(
        grok,
        [entry('GROK', 'grok-3-mini', true, false)],
        NamedModelCapability.CHAT,
      ),
    ).toBe('CONNECTOR_DOWN');
  });

  it('NO_FITTING_MODEL when the provider has nothing for what is asked', () => {
    expect(
      namedModelUnavailableReason(
        grok,
        [entry('GROK', 'grok-3-mini', true, true)],
        NamedModelCapability.IMAGE,
      ),
    ).toBe('NO_FITTING_MODEL');
  });
});
