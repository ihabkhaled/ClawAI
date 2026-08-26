import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { InstantiateTemplateDialog } from '@/components/workspace-chains/instantiate-template-dialog';
import type { WorkspaceChainTemplate } from '@/types';

const t = (key: string, params?: Record<string, string | number>): string =>
  params?.value !== undefined ? `${key}:${String(params.value)}` : key;

function makeTemplate(overrides: Partial<WorkspaceChainTemplate> = {}): WorkspaceChainTemplate {
  return {
    id: 'tmpl-1',
    key: 'ticket-and-notify',
    name: 'Ticket and notify',
    description: 'Create a Jira ticket and notify the team.',
    category: 'productivity',
    requiredProviders: [],
    dslTemplate: { steps: [] },
    version: 1,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('InstantiateTemplateDialog', () => {
  it('renders the template name and description', () => {
    render(
      <InstantiateTemplateDialog
        open
        template={makeTemplate()}
        connectors={[]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        error={null}
        t={t}
      />,
    );
    expect(screen.getByText('Ticket and notify')).toBeInTheDocument();
    expect(screen.getByText('Create a Jira ticket and notify the team.')).toBeInTheDocument();
  });

  it('disables Create until a name is entered (template has no required providers)', async () => {
    const user = userEvent.setup();
    render(
      <InstantiateTemplateDialog
        open
        template={makeTemplate()}
        connectors={[]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        error={null}
        t={t}
      />,
    );
    const createButton = screen.getByRole('button', { name: 'workspaceChains.instantiate.create' });
    expect(createButton).toBeDisabled();
    await user.type(screen.getByLabelText(/workspaceChains.instantiate.name/), 'My automation');
    expect(createButton).toBeEnabled();
  });

  it('submits the trimmed name and current connector selections', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <InstantiateTemplateDialog
        open
        template={makeTemplate()}
        connectors={[]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isPending={false}
        error={null}
        t={t}
      />,
    );
    await user.type(screen.getByLabelText(/workspaceChains.instantiate.name/), '  My automation  ');
    await user.click(screen.getByRole('button', { name: 'workspaceChains.instantiate.create' }));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'My automation', connectorSelections: {} });
  });

  it('shows a missing-connector warning when a required provider has no connectors', () => {
    render(
      <InstantiateTemplateDialog
        open
        template={makeTemplate({ requiredProviders: ['JIRA'] })}
        connectors={[]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        error={null}
        t={t}
      />,
    );
    expect(screen.getByText('workspaceChains.instantiate.noConnector:JIRA')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'workspaceChains.instantiate.create' }),
    ).toBeDisabled();
  });

  it('shows the creating label and disables both buttons while pending', () => {
    render(
      <InstantiateTemplateDialog
        open
        template={makeTemplate()}
        connectors={[]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending
        error={null}
        t={t}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'workspaceChains.instantiate.creating' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeDisabled();
  });

  it('renders the submit error message when present', () => {
    render(
      <InstantiateTemplateDialog
        open
        template={makeTemplate()}
        connectors={[]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        error="Something went wrong"
        t={t}
      />,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <InstantiateTemplateDialog
        open
        template={makeTemplate()}
        connectors={[]}
        onClose={onClose}
        onSubmit={vi.fn()}
        isPending={false}
        error={null}
        t={t}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
