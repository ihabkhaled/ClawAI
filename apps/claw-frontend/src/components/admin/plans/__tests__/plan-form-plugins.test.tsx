import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlanForm } from '@/components/admin/plans/plan-form';
import { PLAN_FORM_DEFAULTS } from '@/constants/plan.constants';
import type { PlanFormProps } from '@/types';

function makeProps(overrides: Partial<PlanFormProps> = {}): PlanFormProps {
  return {
    state: { ...PLAN_FORM_DEFAULTS, name: 'Free', slug: 'free' },
    fieldErrors: {},
    paygCreditPreview: null,
    setField: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
    isEdit: true,
    submitErrorMessage: null,
    t: (key: string) => key,
    ...overrides,
  };
}

describe('PlanForm plugins gate and caps', () => {
  it('renders the module as ON by default, matching the database default', () => {
    render(<PlanForm {...makeProps()} />);
    expect(screen.getByLabelText('pluginsAccess.planGate.allowPlugins')).toBeChecked();
  });

  it('reports a gate toggle through setField', () => {
    const setField = vi.fn();
    render(<PlanForm {...makeProps({ setField })} />);
    fireEvent.click(screen.getByLabelText('pluginsAccess.planGate.allowPlugins'));
    expect(setField).toHaveBeenCalledWith('allowPlugins', false);
  });

  it('renders the Free caps as typed numbers with their bounds', () => {
    render(<PlanForm {...makeProps()} />);
    const installs = screen.getByLabelText('pluginsAccess.planForm.maxInstalledPlugins');
    expect(installs).toHaveValue(5);
    expect(installs).toHaveAttribute('min', '0');
    expect(installs).toHaveAttribute('max', '10000');
    const servers = screen.getByLabelText('pluginsAccess.planForm.maxUserMcpServers');
    expect(servers).toHaveValue(0);
    expect(servers).toHaveAttribute('min', '0');
    expect(servers).toHaveAttribute('max', '1000');
  });

  it('shows a blank cap as empty (unlimited), not as zero', () => {
    render(
      <PlanForm
        {...makeProps({
          state: {
            ...PLAN_FORM_DEFAULTS,
            name: 'Unlimited',
            slug: 'unlimited',
            maxInstalledPlugins: '',
            maxUserMcpServers: '',
          },
        })}
      />,
    );
    expect(screen.getByLabelText('pluginsAccess.planForm.maxInstalledPlugins')).toHaveValue(null);
    expect(screen.getByLabelText('pluginsAccess.planForm.maxUserMcpServers')).toHaveValue(null);
  });

  it('reports cap edits through setField', () => {
    const setField = vi.fn();
    render(<PlanForm {...makeProps({ setField })} />);
    fireEvent.change(screen.getByLabelText('pluginsAccess.planForm.maxInstalledPlugins'), {
      target: { value: '25' },
    });
    fireEvent.change(screen.getByLabelText('pluginsAccess.planForm.maxUserMcpServers'), {
      target: { value: '3' },
    });
    expect(setField).toHaveBeenCalledWith('maxInstalledPlugins', '25');
    expect(setField).toHaveBeenCalledWith('maxUserMcpServers', '3');
  });
});
