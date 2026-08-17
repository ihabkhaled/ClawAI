import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import {
  buildChainNlDraftPrompt,
  buildChainNlDraftRetryPrompt,
  buildChainNlDraftSystemPrompt,
} from '../chain-nl-draft-prompt.utility';

describe('buildChainNlDraftSystemPrompt', () => {
  it('lists each connector id with its provider-specific actions', () => {
    const prompt = buildChainNlDraftSystemPrompt([
      { id: 'jira-1', provider: WorkspaceProvider.JIRA },
      { id: 'slack-1', provider: WorkspaceProvider.SLACK },
    ]);
    expect(prompt).toContain('jira-1');
    expect(prompt).toContain('CREATE_TICKET');
    expect(prompt).toContain('slack-1');
    expect(prompt).toContain('SEND_SLACK_MESSAGE');
  });

  it('never lists a connector id under the wrong provider section', () => {
    const prompt = buildChainNlDraftSystemPrompt([
      { id: 'jira-1', provider: WorkspaceProvider.JIRA },
    ]);
    expect(prompt).not.toContain('SEND_SLACK_MESSAGE');
  });

  it('omits connectors for a provider with no write actions', () => {
    const prompt = buildChainNlDraftSystemPrompt([
      { id: 'cal-1', provider: WorkspaceProvider.GOOGLE_CALENDAR },
    ]);
    expect(prompt).not.toContain('cal-1');
    expect(prompt).toContain('(none)');
  });

  it('renders "(none)" when given no connectors at all', () => {
    const prompt = buildChainNlDraftSystemPrompt([]);
    expect(prompt).toContain('(none)');
  });
});

describe('buildChainNlDraftPrompt', () => {
  it('passes the raw user request through unchanged as the user prompt', () => {
    const result = buildChainNlDraftPrompt(
      [{ id: 'jira-1', provider: WorkspaceProvider.JIRA }],
      'file a ticket when something breaks',
    );
    expect(result.userPrompt).toBe('file a ticket when something breaks');
    expect(result.systemPrompt).toContain('jira-1');
  });
});

describe('buildChainNlDraftRetryPrompt', () => {
  it('appends the validation error to the original prompt', () => {
    const retry = buildChainNlDraftRetryPrompt('do the thing', 'response was not valid JSON');
    expect(retry).toContain('do the thing');
    expect(retry).toContain('response was not valid JSON');
  });
});
