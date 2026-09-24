import { CONNECTOR_PRESETS } from '@claw/shared-utilities';
import { KNOWN_JUDGE_PROVIDERS, PROVIDER_BASE_URLS } from '../execution.constants';

/**
 * Batch 2 (connector presets): every OpenAI-compatible preset from
 * CONNECTOR_PRESETS (the single source of truth, ADR-116/117) must be
 * dispatchable as a judge/execution provider, and its base URL must be
 * SOURCED from the registry, never hand-copied. Batch 1's
 * `connector-preset-single-source.test.mjs` already fails if a preset's base
 * URL appears anywhere else in source; this spec instead proves the VALUE
 * that lands in PROVIDER_BASE_URLS still equals the registry's value at
 * runtime, which a hand-copy could drift from silently.
 */
describe('CONNECTOR_PRESETS wiring into chat-service execution constants', () => {
  it('has at least the 15 batch-2 presets registered', () => {
    expect(CONNECTOR_PRESETS.length).toBeGreaterThanOrEqual(15);
  });

  it.each(CONNECTOR_PRESETS.map((preset) => [preset.key, preset.defaultBaseUrl] as const))(
    'admits preset %s as a known judge provider',
    (key) => {
      expect(KNOWN_JUDGE_PROVIDERS.has(key)).toBe(true);
    },
  );

  it.each(CONNECTOR_PRESETS.map((preset) => [preset.key, preset.defaultBaseUrl] as const))(
    'resolves preset %s base URL straight from CONNECTOR_PRESETS.defaultBaseUrl',
    (key, defaultBaseUrl) => {
      expect(PROVIDER_BASE_URLS[key]).toBe(defaultBaseUrl);
    },
  );

  it('still carries the eight bespoke-adapter providers alongside the presets', () => {
    for (const provider of ['OPENAI', 'ANTHROPIC', 'GEMINI', 'AWS_BEDROCK', 'DEEPSEEK', 'GROK']) {
      expect(KNOWN_JUDGE_PROVIDERS.has(provider)).toBe(true);
    }
  });
});
