import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SuggestionRuleRow } from '@/components/admin/suggestion-rule-row';
import type { SuggestionTriggerRule } from '@/types/ai-action-policy.types';

function makeRule(overrides: Partial<SuggestionTriggerRule> = {}): SuggestionTriggerRule {
  return {
    id: 'r1',
    name: 'github-pr-large-opened',
    description: 'When a GitHub PR with > 500 LOC is opened',
    eventType: 'workspace.webhook.received',
    providerRegex: '^GITHUB$',
    contentRegex: '"action"\\s*:\\s*"opened"',
    actionKindToSuggest: 'SUMMARIZE',
    isActive: true,
    isSystemDefault: true,
    priority: 500,
    perRuleBudgetPerHour: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('SuggestionRuleRow', () => {
  it('renders rule details and description', () => {
    render(
      <SuggestionRuleRow
        rule={makeRule()}
        onToggleActive={vi.fn()}
        onDelete={vi.fn()}
        isMutating={false}
        t={(key) => key}
      />,
    );
    expect(screen.getByText('github-pr-large-opened')).toBeInTheDocument();
    expect(screen.getByText('workspace.webhook.received')).toBeInTheDocument();
    expect(screen.getByText('SUMMARIZE')).toBeInTheDocument();
    expect(screen.getByText('^GITHUB$')).toBeInTheDocument();
  });

  it('shows system-default badge when applicable', () => {
    render(
      <SuggestionRuleRow
        rule={makeRule({ isSystemDefault: true })}
        onToggleActive={vi.fn()}
        onDelete={vi.fn()}
        isMutating={false}
        t={(key) => key}
      />,
    );
    expect(screen.getByText('adminAutomation.rules.systemDefault')).toBeInTheDocument();
  });

  it('renders disabled delete button for system-default rule', () => {
    render(
      <SuggestionRuleRow
        rule={makeRule({ isSystemDefault: true })}
        onToggleActive={vi.fn()}
        onDelete={vi.fn()}
        isMutating={false}
        t={(key) => key}
      />,
    );
    const deleteBtn = screen.getByRole('button', {
      name: 'adminAutomation.rules.cannotDelete',
    });
    expect(deleteBtn).toBeDisabled();
  });

  it('invokes onDelete for user-created rule', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <SuggestionRuleRow
        rule={makeRule({ isSystemDefault: false, id: 'r2' })}
        onToggleActive={vi.fn()}
        onDelete={onDelete}
        isMutating={false}
        t={(key) => key}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'adminAutomation.rules.delete' }));
    expect(onDelete).toHaveBeenCalledWith('r2');
  });
});
