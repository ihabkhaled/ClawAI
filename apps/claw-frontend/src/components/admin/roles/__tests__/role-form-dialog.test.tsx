import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RoleFormDialog } from '@/components/admin/roles/role-form-dialog';

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  onSubmitCreate: vi.fn(),
  isSubmitting: false,
  submitErrorMessage: null,
  t: (key: string) => key,
};

describe('RoleFormDialog', () => {
  it('renders the create title and submit label', () => {
    render(<RoleFormDialog {...baseProps} />);
    expect(screen.getByText('adminRoles.create.title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'adminRoles.create.submit' })).toBeInTheDocument();
  });

  it('does not call onSubmitCreate when validation fails', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    render(<RoleFormDialog {...baseProps} onSubmitCreate={onSubmitCreate} />);
    await user.click(screen.getByRole('button', { name: 'adminRoles.create.submit' }));
    expect(onSubmitCreate).not.toHaveBeenCalled();
  });

  it('submits a valid payload', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    render(<RoleFormDialog {...baseProps} onSubmitCreate={onSubmitCreate} />);
    await user.type(screen.getByLabelText('adminRoles.form.name'), 'Editor');
    await user.type(screen.getByLabelText('adminRoles.form.slug'), 'editor');
    await user.click(screen.getByRole('button', { name: 'adminRoles.create.submit' }));
    expect(onSubmitCreate).toHaveBeenCalledTimes(1);
    expect(onSubmitCreate.mock.calls[0]?.[0]).toMatchObject({ slug: 'editor', name: 'Editor' });
  });

  it('shows the submitting label when isSubmitting is true', () => {
    render(<RoleFormDialog {...baseProps} isSubmitting />);
    expect(screen.getByText('adminRoles.create.submitting')).toBeInTheDocument();
  });

  it('renders the submit error alert when provided', () => {
    render(<RoleFormDialog {...baseProps} submitErrorMessage="slug already exists" />);
    expect(screen.getByRole('alert')).toHaveTextContent('slug already exists');
  });

  it('calls onOpenChange(false) when cancel is clicked', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<RoleFormDialog {...baseProps} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
