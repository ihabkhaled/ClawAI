import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EditUserDialog } from '@/components/admin/edit-user-dialog';
import type { AdminUser } from '@/types/audit.types';

const user: AdminUser = {
  id: 'u1',
  email: 'ada@claw.local',
  username: 'ada',
  role: 'user',
  status: 'active',
  createdAt: '2026-05-01T00:00:00.000Z',
  activePlanId: null,
  isSuperAdmin: false,
  emailVerifiedAt: null,
  firstName: 'Ada',
  lastName: 'Khaled',
};

function renderDialog(overrides: Partial<React.ComponentProps<typeof EditUserDialog>> = {}) {
  const onSave = vi.fn();
  const onRotatePassword = vi.fn();
  render(
    <EditUserDialog
      open
      user={user}
      actor={{ id: 'admin-1', isSuperAdmin: false }}
      isSaving={false}
      isRotating={false}
      onClose={vi.fn()}
      onSave={onSave}
      onRotatePassword={onRotatePassword}
      t={(key: string) => key}
      {...overrides}
    />,
  );
  return { onSave, onRotatePassword };
}

describe('EditUserDialog', () => {
  // The fields used to sit in a four-column grid whose error rows carried
  // col-start-2, which forced implicit columns onto the parent and overlapped
  // every label with the next field. Distinct labelled controls pin the fix.
  it('gives every field its own labelled control, filled from the user', () => {
    renderDialog();

    expect(screen.getByLabelText('admin.editUserUsername')).toHaveValue('ada');
    expect(screen.getByLabelText('admin.editUserFirstName')).toHaveValue('Ada');
    expect(screen.getByLabelText('admin.editUserLastName')).toHaveValue('Khaled');
  });

  it('sends the trimmed edit and turns a cleared name into null', async () => {
    const { onSave } = renderDialog();

    await userEvent.clear(screen.getByLabelText('admin.editUserLastName'));
    await userEvent.click(screen.getByRole('button', { name: 'admin.editUserSave' }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('u1', {
        username: 'ada',
        firstName: 'Ada',
        lastName: null,
      }),
    );
  });

  it('blocks saving an invalid username and explains why', async () => {
    const { onSave } = renderDialog();

    await userEvent.type(screen.getByLabelText('admin.editUserUsername'), '@@');

    expect(await screen.findByText('admin.editUserUsernameInvalid')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'admin.editUserSave' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('locks every control for a super admin and says so', () => {
    renderDialog({ user: { ...user, isSuperAdmin: true } });

    expect(screen.getByLabelText('admin.editUserUsername')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'admin.editUserSave' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'admin.editUserRotatePassword' })).toBeDisabled();
    expect(screen.getByText('admin.editUserSuperAdminNotice')).toBeInTheDocument();
  });

  // Rotate and cancel sit inside the form, so without an explicit button type
  // they would submit the edit instead of doing their own job.
  it('never submits the form from the rotate button', async () => {
    const { onSave, onRotatePassword } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'admin.editUserRotatePassword' }));

    expect(onRotatePassword).toHaveBeenCalledWith('u1');
    expect(onSave).not.toHaveBeenCalled();
  });
});
