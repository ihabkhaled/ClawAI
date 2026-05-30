import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AutomationPreferenceRow } from '@/components/automation-preferences/automation-preference-row';
import type {
  AutomationPreferenceView,
  AutomationPreferenceRowProps,
} from '@/types/automation-preference.types';

function makePref(overrides: Partial<AutomationPreferenceView> = {}): AutomationPreferenceView {
  return {
    actionKind: 'SUMMARIZE',
    isEnabled: true,
    autoApproveBelowRiskScore: 25,
    perDayBudget: 10,
    providers: [],
    ...overrides,
  };
}

// Passthrough translator that surfaces the key — assertions use these keys.
const t: AutomationPreferenceRowProps['t'] = ((key: string) => key) as AutomationPreferenceRowProps['t'];

function renderRow(canManage: boolean): void {
  render(
    <AutomationPreferenceRow
      preference={makePref()}
      onSave={vi.fn()}
      isPending={false}
      canManage={canManage}
      t={t}
    />,
  );
}

describe('AutomationPreferenceRow — RBAC-driven disabled state', () => {
  describe('as a regular USER (canManage=false)', () => {
    it('renders the action kind + status (read-only viewing stays available)', () => {
      renderRow(false);
      expect(screen.getByText('SUMMARIZE')).toBeInTheDocument();
    });

    it('disables every save control so the row cannot be mutated', () => {
      renderRow(false);
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeDisabled();
      const slider = screen.getByRole('slider');
      expect(slider).toBeDisabled();
      const budgetInput = screen.getByRole('spinbutton');
      expect(budgetInput).toBeDisabled();
      const clearButton = screen.getByRole('button', { name: /automationPreferences\.row\.clear/i });
      expect(clearButton).toBeDisabled();
    });
  });

  describe('as an ADMIN (canManage=true)', () => {
    it('leaves the toggle + slider + budget input enabled for mutation', () => {
      renderRow(true);
      const toggle = screen.getByRole('switch');
      expect(toggle).not.toBeDisabled();
      const slider = screen.getByRole('slider');
      expect(slider).not.toBeDisabled();
      const budgetInput = screen.getByRole('spinbutton');
      expect(budgetInput).not.toBeDisabled();
    });
  });
});
