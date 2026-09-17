import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SmartRouterAddEntryForm } from '@/components/admin/smart-router/smart-router-add-entry-form';
import { RouterProvider } from '@/enums/router-configuration.enum';

const t = (key: string): string => key;

// The model field is a picker over the real catalog, not free text, so the
// catalog is stubbed here. ANTHROPIC is the form's default provider.
vi.mock('@/hooks/admin/use-smart-router-selectable-deployments', () => ({
  useSmartRouterSelectableDeployments: () => ({
    deployments: [
      {
        id: 'dep-1',
        provider: RouterProvider.ANTHROPIC,
        providerModelId: 'claude-sonnet-4-5',
        isValidated: true,
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));

describe('SmartRouterAddEntryForm', () => {
  it('does not call onAdd when the model alias is blank', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<SmartRouterAddEntryForm onAdd={onAdd} isPending={false} t={t} />);

    await user.click(screen.getByRole('button', { name: 'smartRouterAdmin.entryForm.submit' }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText('smartRouterAdmin.entryForm.validationError')).toBeInTheDocument();
  });

  it('submits with the selected model and parsed triggers', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<SmartRouterAddEntryForm onAdd={onAdd} isPending={false} t={t} />);

    await user.click(screen.getByLabelText('smartRouterAdmin.entryForm.modelAlias'));
    await user.click(screen.getByRole('option', { name: /claude-sonnet-4-5/ }));
    await user.type(
      screen.getByLabelText('smartRouterAdmin.entryForm.triggers'),
      'timeout, low_confidence',
    );
    await user.click(screen.getByRole('button', { name: 'smartRouterAdmin.entryForm.submit' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0]?.[0]).toMatchObject({
      modelAlias: 'claude-sonnet-4-5',
      triggers: ['timeout', 'low_confidence'],
    });
  });

  it('disables the submit button while pending', () => {
    render(<SmartRouterAddEntryForm onAdd={vi.fn()} isPending t={t} />);
    expect(
      screen.getByRole('button', { name: 'smartRouterAdmin.entryForm.submit' }),
    ).toBeDisabled();
  });
});
