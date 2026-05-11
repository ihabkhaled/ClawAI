import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AiActionPolicyRow } from '@/components/admin/ai-action-policy-row';
import { AiActionPolicyKind } from '@/enums/ai-action-policy-kind.enum';
import { RiskLabel } from '@/enums/risk-label.enum';
import type { AiActionPolicy } from '@/types/ai-action-policy.types';

function makePolicy(overrides: Partial<AiActionPolicy> = {}): AiActionPolicy {
  return {
    id: 'p1',
    name: 'deny-pii',
    kind: AiActionPolicyKind.DENY,
    description: 'Blocks PII leakage',
    providerRegex: '.*',
    actionKindRegex: '.*',
    riskMaxLabel: RiskLabel.CRITICAL,
    riskMaxScore: 100,
    priority: 1000,
    requireReason: false,
    isActive: true,
    isSystemDefault: true,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('AiActionPolicyRow', () => {
  it('renders policy name and translated kind/risk labels', () => {
    render(
      <AiActionPolicyRow
        policy={makePolicy()}
        onToggleActive={vi.fn()}
        onDelete={vi.fn()}
        isMutating={false}
        t={(key) => key}
      />,
    );
    expect(screen.getByText('deny-pii')).toBeInTheDocument();
    expect(screen.getByText('adminAutomation.policies.kindLabel.DENY')).toBeInTheDocument();
    expect(screen.getByText('adminAutomation.policies.riskLabel.CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('Blocks PII leakage')).toBeInTheDocument();
  });

  it('shows system-default badge when isSystemDefault is true', () => {
    render(
      <AiActionPolicyRow
        policy={makePolicy({ isSystemDefault: true })}
        onToggleActive={vi.fn()}
        onDelete={vi.fn()}
        isMutating={false}
        t={(key) => key}
      />,
    );
    expect(screen.getByText('adminAutomation.policies.systemDefault')).toBeInTheDocument();
  });

  it('renders disabled delete button for system-default policies', () => {
    render(
      <AiActionPolicyRow
        policy={makePolicy({ isSystemDefault: true })}
        onToggleActive={vi.fn()}
        onDelete={vi.fn()}
        isMutating={false}
        t={(key) => key}
      />,
    );
    const cannotDeleteBtn = screen.getByRole('button', {
      name: 'adminAutomation.policies.cannotDelete',
    });
    expect(cannotDeleteBtn).toBeDisabled();
  });

  it('invokes onDelete for user-created policies', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <AiActionPolicyRow
        policy={makePolicy({ isSystemDefault: false, id: 'p2' })}
        onToggleActive={vi.fn()}
        onDelete={onDelete}
        isMutating={false}
        t={(key) => key}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'adminAutomation.policies.delete' }));
    expect(onDelete).toHaveBeenCalledWith('p2');
  });

  it('disables actions when isMutating is true', () => {
    render(
      <AiActionPolicyRow
        policy={makePolicy({ isSystemDefault: false })}
        onToggleActive={vi.fn()}
        onDelete={vi.fn()}
        isMutating
        t={(key) => key}
      />,
    );
    const deleteBtn = screen.getByRole('button', { name: 'adminAutomation.policies.delete' });
    expect(deleteBtn).toBeDisabled();
  });
});
