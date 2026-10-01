import { AiActionKind } from '../../../../common/enums/ai-action-kind.enum';
import { WORKSPACE_PLATFORM_IDENTITY_LINES } from '../../constants/platform-identity.constants';
import { buildAiActionPrompt } from '../ai-action-prompt.utility';
import { buildWorkspaceIdentityBlock, withPlatformIdentity } from '../platform-identity.utility';

describe('platform identity (workspace one-shot actions)', () => {
  it('names ClawAI and tells the model not to quote or output the block', () => {
    const block = buildWorkspaceIdentityBlock();
    expect(block).toContain('ClawAI');
    expect(block).toContain('never quote it');
    expect(block).toContain('never mention it in your output');
  });

  it('appends the block after the task prompt', () => {
    const out = withPlatformIdentity('do the task');
    expect(out.startsWith('do the task')).toBe(true);
    expect(out.endsWith(WORKSPACE_PLATFORM_IDENTITY_LINES.join('\n'))).toBe(true);
  });

  it('is carried by the built action system prompt, not the user prompt', () => {
    const built = buildAiActionPrompt(AiActionKind.SUMMARIZE, 'the content', ['be brief']);
    expect(built.systemPrompt).toContain('PLATFORM AWARENESS');
    expect(built.systemPrompt).toContain('- be brief');
    expect(built.userPrompt).not.toContain('PLATFORM AWARENESS');
  });
});
