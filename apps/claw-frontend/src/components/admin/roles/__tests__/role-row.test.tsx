import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RoleRow } from '@/components/admin/roles/role-row';
import type { RoleWithPermissions } from '@/types';

function makeRole(overrides: Partial<RoleWithPermissions> = {}): RoleWithPermissions {
  return {
    id: 'r1',
    slug: 'editor',
    name: 'Editor',
    description: 'Can edit',
    isSystem: false,
    isAssignable: true,
    permissions: ['CHAT_READ', 'CHAT_WRITE'],
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

const baseProps = {
  pendingId: null,
  onDelete: vi.fn(),
  detailHref: '/admin/roles/r1',
  t: (key: string) => key,
};

describe('RoleRow', () => {
  it('renders name, slug and description; delete button is enabled for non-system roles', () => {
    render(<RoleRow role={makeRole()} {...baseProps} />);
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('editor')).toBeInTheDocument();
    expect(screen.getByText('Can edit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.delete' })).toBeEnabled();
  });

  it('shows the system badge and disables delete for system roles', () => {
    render(<RoleRow role={makeRole({ isSystem: true })} {...baseProps} />);
    expect(screen.getByText('adminRoles.systemBadge')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.delete' })).toBeDisabled();
  });

  it('shows the not-assignable badge when isAssignable is false', () => {
    render(<RoleRow role={makeRole({ isAssignable: false })} {...baseProps} />);
    expect(screen.getByText('adminRoles.notAssignableBadge')).toBeInTheDocument();
  });

  it('omits the description paragraph when description is null', () => {
    render(<RoleRow role={makeRole({ description: null })} {...baseProps} />);
    expect(screen.queryByText('Can edit')).not.toBeInTheDocument();
  });

  it('invokes onDelete with the role id for non-system roles', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<RoleRow role={makeRole()} {...baseProps} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: 'common.delete' }));
    expect(onDelete).toHaveBeenCalledWith('r1');
  });

  it('disables delete while the row is pending', () => {
    render(<RoleRow role={makeRole()} {...baseProps} pendingId="r1" />);
    expect(screen.getByRole('button', { name: 'common.delete' })).toBeDisabled();
  });
});
