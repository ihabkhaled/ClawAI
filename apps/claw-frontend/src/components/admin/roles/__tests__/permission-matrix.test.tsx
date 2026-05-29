import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PermissionGroupSection } from '@/components/admin/roles/permission-group-section';
import { PermissionMatrix } from '@/components/admin/roles/permission-matrix';
import type { PermissionGroup } from '@/types';

const chatGroup: PermissionGroup = {
  groupKey: 'CHAT',
  permissions: ['CHAT_READ', 'CHAT_WRITE'],
};

const t = (key: string): string => key;

describe('PermissionMatrix', () => {
  it('renders the empty state when there are no groups', () => {
    render(
      <PermissionMatrix
        groups={[]}
        selected={new Set()}
        togglePermission={vi.fn()}
        selectGroup={vi.fn()}
        disabled={false}
        t={t}
      />,
    );
    expect(screen.getByText('adminRoles.detail.noPermissions')).toBeInTheDocument();
  });

  it('renders one section per group', () => {
    render(
      <PermissionMatrix
        groups={[chatGroup]}
        selected={new Set(['CHAT_READ'])}
        togglePermission={vi.fn()}
        selectGroup={vi.fn()}
        disabled={false}
        t={t}
      />,
    );
    expect(screen.getByText('CHAT_READ')).toBeInTheDocument();
    expect(screen.getByText('CHAT_WRITE')).toBeInTheDocument();
  });
});

describe('PermissionGroupSection', () => {
  it('shows the select-group label when not all permissions are selected', () => {
    render(
      <PermissionGroupSection
        group={chatGroup}
        selected={new Set(['CHAT_READ'])}
        togglePermission={vi.fn()}
        selectGroup={vi.fn()}
        disabled={false}
        t={t}
      />,
    );
    expect(screen.getByText('adminRoles.detail.selectGroup')).toBeInTheDocument();
  });

  it('shows the clear-group label when all permissions are selected', () => {
    render(
      <PermissionGroupSection
        group={chatGroup}
        selected={new Set(['CHAT_READ', 'CHAT_WRITE'])}
        togglePermission={vi.fn()}
        selectGroup={vi.fn()}
        disabled={false}
        t={t}
      />,
    );
    expect(screen.getByText('adminRoles.detail.clearGroup')).toBeInTheDocument();
  });

  it('calls selectGroup with the inverse of allSelected', async () => {
    const selectGroup = vi.fn();
    const user = userEvent.setup();
    render(
      <PermissionGroupSection
        group={chatGroup}
        selected={new Set(['CHAT_READ'])}
        togglePermission={vi.fn()}
        selectGroup={selectGroup}
        disabled={false}
        t={t}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'adminRoles.detail.selectGroup' }));
    expect(selectGroup).toHaveBeenCalledWith('CHAT', true);
  });

  it('calls togglePermission when a checkbox is clicked', async () => {
    const togglePermission = vi.fn();
    const user = userEvent.setup();
    render(
      <PermissionGroupSection
        group={chatGroup}
        selected={new Set()}
        togglePermission={togglePermission}
        selectGroup={vi.fn()}
        disabled={false}
        t={t}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox') as HTMLElement[];
    await user.click(checkboxes[0]!);
    expect(togglePermission).toHaveBeenCalledWith('CHAT_READ');
  });

  it('disables controls when disabled is true', () => {
    render(
      <PermissionGroupSection
        group={chatGroup}
        selected={new Set()}
        togglePermission={vi.fn()}
        selectGroup={vi.fn()}
        disabled
        t={t}
      />,
    );
    expect(screen.getByRole('button', { name: 'adminRoles.detail.selectGroup' })).toBeDisabled();
  });
});
