import { ModelKind } from '../../../generated/prisma';
import { classifyOpenAiModelKind } from '../utilities/openai-model-kind.utility';

describe('classifyOpenAiModelKind', () => {
  it.each([
    'gpt-5-pro',
    'gpt-5-pro-2025-10-06',
    'o1-pro',
    'o1-pro-2025-03-19',
    'o3-pro',
    'gpt-5.2-pro-2025-12-11',
    'gpt-5.4-pro',
    'gpt-5.5-pro-2026-04-23',
    'gpt-5.3-codex',
    'gpt-5-codex',
    'gpt-5.1-codex-max',
    'gpt-5.1-codex-mini',
    'o3-deep-research',
  ])('%s is responses-only, so TOOL', (id) => {
    expect(classifyOpenAiModelKind(id)).toBe(ModelKind.TOOL);
  });

  it.each([
    'gpt-5',
    'gpt-5-mini',
    'gpt-5.2',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4.1',
    'o3',
    'o3-mini',
    'o4-mini',
    'gpt-3.5-turbo',
    'chatgpt-4o-latest',
    'gpt-5-chat-latest',
  ])('%s answers chat/completions, so CHAT', (id) => {
    expect(classifyOpenAiModelKind(id)).toBe(ModelKind.CHAT);
  });

  it('is case-insensitive', () => {
    expect(classifyOpenAiModelKind('GPT-5-PRO')).toBe(ModelKind.TOOL);
  });
});
