import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceConnectorForm } from '@/components/workspace/workspace-connector-form';

describe('WorkspaceConnectorForm', () => {
  it('submits a new connector with the default provider and permission level', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <WorkspaceConnectorForm
        open
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        isPending={false}
        t={(key) => key}
      />,
    );

    await user.type(screen.getByLabelText('workspaceConnectors.name'), 'Workspace GitHub');
    await user.click(screen.getByRole('button', { name: 'Create Connector' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Workspace GitHub',
      provider: 'GITHUB',
      permissionLevel: 'READ',
    });
  });
});
