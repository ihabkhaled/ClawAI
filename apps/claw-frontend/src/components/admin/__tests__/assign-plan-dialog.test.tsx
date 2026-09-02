import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AssignPlanDialog } from '../assign-plan-dialog';

const t = (key: string): string => key;
const user = { id: 'user-1' } as never;

describe('AssignPlanDialog', () => {
  it('renders nothing interactive when there is no target', () => {
    render(
      <AssignPlanDialog
        open={false}
        user={null}
        targetPlanId={null}
        isSaving={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByText('admin.assignPlanDialogTitle')).not.toBeInTheDocument();
  });

  it('renders the duration and reason fields when open with a target', () => {
    render(
      <AssignPlanDialog
        open
        user={user}
        targetPlanId="plan-pro"
        isSaving={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByLabelText('admin.assignPlanDurationLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('admin.assignPlanReasonLabel')).toBeInTheDocument();
  });

  it('disables the confirm button while saving', () => {
    render(
      <AssignPlanDialog
        open
        user={user}
        targetPlanId="plan-pro"
        isSaving
        onClose={vi.fn()}
        onSave={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByText('admin.assignPlanConfirm')).toBeDisabled();
  });
});
