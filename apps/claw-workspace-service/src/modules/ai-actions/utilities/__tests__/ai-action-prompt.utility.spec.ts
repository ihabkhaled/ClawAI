import { AiActionKind } from '../../../../common/enums/ai-action-kind.enum';
import { AI_ACTION_MAX_CONTEXT_CHARS } from '../../constants/ai-action-prompts.constants';
import { buildAiActionPrompt, combineSystemAndUser } from '../ai-action-prompt.utility';

describe('buildAiActionPrompt', () => {
  it('builds the template system/user prompt for a known actionKind', () => {
    const result = buildAiActionPrompt(AiActionKind.SUMMARIZE, 'the content');
    expect(result.userPrompt).toContain('the content');
    expect(result.systemPrompt.length).toBeGreaterThan(0);
  });

  it('truncates context longer than the max and appends a truncation marker', () => {
    const longContext = 'a'.repeat(AI_ACTION_MAX_CONTEXT_CHARS + 100);
    const result = buildAiActionPrompt(AiActionKind.SUMMARIZE, longContext);
    expect(result.userPrompt).toContain('[...truncated for length]');
    expect(result.userPrompt.length).toBeLessThan(longContext.length);
  });

  it('does not append a preferences block when none are given', () => {
    const result = buildAiActionPrompt(AiActionKind.DRAFT, 'ctx');
    expect(result.systemPrompt).not.toContain('Known preferences');
  });

  it('appends every given preference as a bullet in the system prompt', () => {
    const result = buildAiActionPrompt(AiActionKind.DRAFT, 'ctx', [
      'User prefers shorter drafts',
      'User prefers a formal tone',
    ]);
    expect(result.systemPrompt).toContain('Known preferences');
    expect(result.systemPrompt).toContain('- User prefers shorter drafts');
    expect(result.systemPrompt).toContain('- User prefers a formal tone');
  });

  it('keeps the base template instructions before the preferences block', () => {
    const base = buildAiActionPrompt(AiActionKind.DRAFT, 'ctx').systemPrompt;
    const withPrefs = buildAiActionPrompt(AiActionKind.DRAFT, 'ctx', ['a preference']);
    expect(withPrefs.systemPrompt.startsWith(base)).toBe(true);
  });
});

describe('combineSystemAndUser', () => {
  it('joins system and user prompts with a separator', () => {
    const combined = combineSystemAndUser('system text', 'user text');
    expect(combined).toContain('system text');
    expect(combined).toContain('user text');
    expect(combined.indexOf('system text')).toBeLessThan(combined.indexOf('user text'));
  });
});
