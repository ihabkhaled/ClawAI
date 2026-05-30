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

function renderRow(): void {
  render(
    <AutomationPreferenceRow
      preference={makePref()}
      onSave={vi.fn()}
      isPending={false}
      t={t}
    />,
  );
}

describe('AutomationPreferenceRow — per-USER editable defaults', () => {
  it('renders the action kind + status (read-only viewing stays available)', () => {
    renderRow();
    expect(screen.getByText('SUMMARIZE')).toBeInTheDocument();
  });

  it('leaves the toggle + slider + budget input + clear button enabled by default so the user can tune their own thresholds', () => {
    renderRow();
    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeDisabled();
    const slider = screen.getByRole('slider');
    expect(slider).not.toBeDisabled();
    const budgetInput = screen.getByRole('spinbutton');
    expect(budgetInput).not.toBeDisabled();
    const clearButton = screen.getByRole('button', { name: /automationPreferences\.row\.clear/i });
    expect(clearButton).not.toBeDisabled();
  });
});
