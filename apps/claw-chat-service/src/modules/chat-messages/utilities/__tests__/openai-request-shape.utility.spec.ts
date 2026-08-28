import {
  modelRejectsCustomTemperature,
  modelRequiresMaxCompletionTokens,
} from '../openai-request-shape.utility';

describe('OpenAI reasoning-family request shape', () => {
  // Verified against the live API: `max_tokens` is a 400 on these, and
  // `temperature: 0.7` is a 400 — only the default is accepted.
  it.each([
    'gpt-5.6-luna',
    'gpt-5.6-sol',
    'gpt-5.5',
    'gpt-5.5-pro',
    'gpt-5',
    'o1-mini',
    'o3',
    'o4-mini',
  ])('%s needs max_completion_tokens and refuses a custom temperature', (model) => {
    expect(modelRequiresMaxCompletionTokens(model)).toBe(true);
    expect(modelRejectsCustomTemperature(model)).toBe(true);
  });

  // These take the old field. The builder also serves DeepSeek, Grok and
  // Anthropic's OpenAI-compatible route, so a rule that caught them too would
  // break providers that never renamed anything.
  it.each([
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
    'deepseek-chat',
    'grok-3',
    'claude-opus-4-6',
    'llama3.1:8b',
  ])('%s keeps max_tokens and its temperature', (model) => {
    expect(modelRequiresMaxCompletionTokens(model)).toBe(false);
    expect(modelRejectsCustomTemperature(model)).toBe(false);
  });

  it('tolerates padding and casing from a stored thread setting', () => {
    expect(modelRequiresMaxCompletionTokens('  GPT-5.6-Luna ')).toBe(true);
  });
});
