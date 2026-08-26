import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ChainTemplateCard } from '@/components/workspace-chains/chain-template-card';
import type { WorkspaceChainTemplate } from '@/types';

const t = (key: string): string => key;

function makeTemplate(overrides: Partial<WorkspaceChainTemplate> = {}): WorkspaceChainTemplate {
  return {
    id: 'tmpl-1',
    key: 'ticket-and-notify',
    name: 'Ticket and notify',
    description: 'Create a Jira ticket and notify the team on Slack.',
    category: 'productivity',
    requiredProviders: ['JIRA', 'SLACK'],
    dslTemplate: { steps: [] },
    version: 1,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ChainTemplateCard', () => {
  it('renders the template name, description, category, and required providers', () => {
    render(<ChainTemplateCard template={makeTemplate()} onInstantiate={vi.fn()} t={t} />);
    expect(screen.getByText('Ticket and notify')).toBeInTheDocument();
    expect(
      screen.getByText('Create a Jira ticket and notify the team on Slack.'),
    ).toBeInTheDocument();
    expect(screen.getByText('productivity')).toBeInTheDocument();
    expect(screen.getByText('JIRA')).toBeInTheDocument();
    expect(screen.getByText('SLACK')).toBeInTheDocument();
  });

  it('calls onInstantiate with the template when the button is clicked', async () => {
    const onInstantiate = vi.fn();
    const user = userEvent.setup();
    const template = makeTemplate();
    render(<ChainTemplateCard template={template} onInstantiate={onInstantiate} t={t} />);
    await user.click(screen.getByRole('button', { name: 'workspaceChains.templates.useTemplate' }));
    expect(onInstantiate).toHaveBeenCalledWith(template);
  });
});
