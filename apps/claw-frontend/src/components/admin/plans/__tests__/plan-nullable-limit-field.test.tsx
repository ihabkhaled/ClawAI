import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlanNullableLimitField } from '@/components/admin/plans/plan-nullable-limit-field';
import { PlanPluginLimits } from '@/components/admin/plans/plan-plugin-limits';
import type { PlanView } from '@/types/plan.types';

import { tStub } from '../../../plugins/__tests__/plugins-fixtures';

function field(value: string, onChange = vi.fn()) {
  render(
    <PlanNullableLimitField
      id="cap"
      label="Max calls"
      value={value}
      max={100}
      onChange={onChange}
      unlimitedLabel="Unlimited"
      placeholder="Leave empty for unlimited"
    />,
  );
  return onChange;
}

describe('PlanNullableLimitField', () => {
  it('shows a number with its bound and the unlimited checkbox off', () => {
    field('25');
    const input = screen.getByLabelText('Max calls');
    expect(input).toHaveValue(25);
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
    expect(screen.getByRole('checkbox', { name: 'Unlimited' })).not.toBeChecked();
  });

  it('reads blank as unlimited, and 0 as a real number (disabled), not unlimited', () => {
    field('');
    expect(screen.getByRole('checkbox', { name: 'Unlimited' })).toBeChecked();
    expect(screen.getByLabelText('Max calls')).toHaveValue(null);
  });

  it('treats 0 as a value, not as unlimited', () => {
    field('0');
    expect(screen.getByRole('checkbox', { name: 'Unlimited' })).not.toBeChecked();
    expect(screen.getByLabelText('Max calls')).toHaveValue(0);
  });

  it('reports typing', () => {
    const onChange = field('5');
    fireEvent.change(screen.getByLabelText('Max calls'), { target: { value: '9' } });
    expect(onChange).toHaveBeenCalledWith('9');
  });

  it('checking unlimited clears the value; unchecking starts at 0 (disabled), never blank', () => {
    const checked = field('5');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Unlimited' }));
    expect(checked).toHaveBeenCalledWith('');
  });

  it('unchecking unlimited writes 0', () => {
    const onChange = field('');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Unlimited' }));
    expect(onChange).toHaveBeenCalledWith('0');
  });
});

describe('PlanPluginLimits', () => {
  const FIXED: Record<string, string> = {
    'adminPlans.unlimited': 'Unlimited',
    'pluginsInstall.planForm.disabled': 'Disabled',
  };
  const t = (key: string, params?: Record<string, string | number>): string =>
    FIXED[key] ?? tStub(key, params);

  function plan(overrides: Partial<PlanView>): PlanView {
    return {
      maxInstalledPlugins: 5,
      maxUserMcpServers: 0,
      maxPluginCallsPerDay: 25,
      ...overrides,
    } as PlanView;
  }

  it('lists the three caps', () => {
    render(<PlanPluginLimits plan={plan({})} t={t} />);
    expect(screen.getByText(/pluginsInstall.planForm.listValue\|5,Disabled,25/)).toBeTruthy();
  });

  it('shows null as unlimited and an absent cap as unlimited too', () => {
    render(
      <PlanPluginLimits
        plan={plan({
          maxInstalledPlugins: null,
          maxUserMcpServers: null,
          maxPluginCallsPerDay: undefined,
        })}
        t={t}
      />,
    );
    expect(screen.getByText(/Unlimited,Unlimited,Unlimited/)).toBeTruthy();
  });
});
