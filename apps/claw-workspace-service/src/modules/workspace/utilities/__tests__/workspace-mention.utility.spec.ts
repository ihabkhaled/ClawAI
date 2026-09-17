import { WorkspaceProvider } from '@claw/shared-types';

import { parseWorkspaceMentions } from '../workspace-mention.utility';

describe('parseWorkspaceMentions', () => {
  it('finds a mentioned provider', () => {
    expect(parseWorkspaceMentions('@github open a PR for this')).toEqual([
      WorkspaceProvider.GITHUB,
    ]);
  });

  it('accepts the hyphenated spelling a person would actually type', () => {
    expect(parseWorkspaceMentions('put it in @google-drive')).toEqual([
      WorkspaceProvider.GOOGLE_DRIVE,
    ]);
  });

  it('is case-insensitive', () => {
    expect(parseWorkspaceMentions('@GitHub and @JIRA')).toEqual([
      WorkspaceProvider.GITHUB,
      WorkspaceProvider.JIRA,
    ]);
  });

  it('does not read an email address as a mention', () => {
    // ops@github.example is a person, not a request to touch GitHub.
    expect(parseWorkspaceMentions('mail ops@github.example about it')).toEqual([]);
  });

  it('ignores a word that is not a provider', () => {
    expect(parseWorkspaceMentions('@everyone please review')).toEqual([]);
  });

  it('returns each provider once, in the order written', () => {
    expect(parseWorkspaceMentions('@jira then @github then @jira again')).toEqual([
      WorkspaceProvider.JIRA,
      WorkspaceProvider.GITHUB,
    ]);
  });

  it('finds nothing in a message with no mention', () => {
    expect(parseWorkspaceMentions('just explain how promises work')).toEqual([]);
  });
});
