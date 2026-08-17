import { WorkspaceActionType } from '../../../../common/enums/workspace-action-type.enum';
import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import { CHAIN_ACTION_CATALOG } from '../chain-action-catalog.constants';

describe('CHAIN_ACTION_CATALOG', () => {
  it('has an entry for every WorkspaceProvider', () => {
    const providers = Object.values(WorkspaceProvider);
    for (const provider of providers) {
      expect(CHAIN_ACTION_CATALOG[provider]).toBeDefined();
    }
  });

  it('only lists real WorkspaceActionType values', () => {
    const validTypes = new Set(Object.values(WorkspaceActionType));
    for (const actions of Object.values(CHAIN_ACTION_CATALOG)) {
      for (const entry of actions) {
        expect(validTypes.has(entry.actionType)).toBe(true);
      }
    }
  });

  it('gives every listed action a non-empty label', () => {
    for (const actions of Object.values(CHAIN_ACTION_CATALOG)) {
      for (const entry of actions) {
        expect(entry.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('leaves read-only providers with no write actions', () => {
    expect(CHAIN_ACTION_CATALOG[WorkspaceProvider.GOOGLE_CALENDAR]).toEqual([]);
    expect(CHAIN_ACTION_CATALOG[WorkspaceProvider.OUTLOOK_CALENDAR]).toEqual([]);
  });

  it('excludes the Figma-composite Jira actions (out of scope for NL drafting)', () => {
    const jiraActionTypes = CHAIN_ACTION_CATALOG[WorkspaceProvider.JIRA].map((a) => a.actionType);
    expect(jiraActionTypes).not.toContain(WorkspaceActionType.CREATE_JIRA_FROM_FIGMA);
    expect(jiraActionTypes).not.toContain(WorkspaceActionType.CREATE_USER_STORY_FROM_FIGMA);
  });
});
