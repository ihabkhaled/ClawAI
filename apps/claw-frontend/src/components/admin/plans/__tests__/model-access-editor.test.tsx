import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ModelAccessEditor } from '@/components/admin/plans/model-access-editor';
import type { ModelAccessEditorProps, ModelAccessRowState } from '@/types';

const sampleRow: ModelAccessRowState = {
  rowKey: 'rk1',
  provider: 'openai',
  model: 'gpt-4o',
  isAllowed: true,
  allowAsPrimary: true,
  allowAsFallback: true,
  allowAsJudge: false,
  allowInCompare: true,
  dailyTokenLimitOverride: '5000',
};

function makeProps(overrides: Partial<ModelAccessEditorProps> = {}): ModelAccessEditorProps {
  return {
    rows: [sampleRow],
    addRow: vi.fn(),
    removeRow: vi.fn(),
    updateRow: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
    isSaving: false,
    saveErrorMessage: null,
    t: (key: string) => key,
    ...overrides,
  };
}

describe('ModelAccessEditor', () => {
  it('renders the empty state when there are no rows', () => {
    render(<ModelAccessEditor {...makeProps({ rows: [] })} />);
    expect(screen.getByText('adminPlans.modelAccess.empty')).toBeInTheDocument();
  });

  it('renders a row with its provider and model values', () => {
    render(<ModelAccessEditor {...makeProps()} />);
    expect(
      (screen.getByLabelText('adminPlans.modelAccess.provider') as HTMLInputElement).value,
    ).toBe('openai');
    expect((screen.getByLabelText('adminPlans.modelAccess.model') as HTMLInputElement).value).toBe(
      'gpt-4o',
    );
  });

  it('invokes addRow when the add button is clicked', async () => {
    const addRow = vi.fn();
    const user = userEvent.setup();
    render(<ModelAccessEditor {...makeProps({ addRow })} />);
    await user.click(screen.getByRole('button', { name: 'adminPlans.modelAccess.addRow' }));
    expect(addRow).toHaveBeenCalled();
  });

  it('invokes removeRow with the row key', async () => {
    const removeRow = vi.fn();
    const user = userEvent.setup();
    render(<ModelAccessEditor {...makeProps({ removeRow })} />);
    await user.click(screen.getByRole('button', { name: 'adminPlans.modelAccess.removeRow' }));
    expect(removeRow).toHaveBeenCalledWith('rk1');
  });

  it('invokes updateRow when the provider input changes', async () => {
    const updateRow = vi.fn();
    const user = userEvent.setup();
    render(<ModelAccessEditor {...makeProps({ updateRow })} />);
    await user.type(screen.getByLabelText('adminPlans.modelAccess.provider'), 'X');
    expect(updateRow).toHaveBeenCalledWith('rk1', 'provider', expect.any(String));
  });

  it('toggles a checkbox flag through updateRow with a boolean', async () => {
    const updateRow = vi.fn();
    const user = userEvent.setup();
    render(<ModelAccessEditor {...makeProps({ updateRow })} />);
    const checkboxes = screen.getAllByRole('checkbox') as HTMLElement[];
    // First checkbox is isAllowed (checked) -> toggling sends a boolean.
    await user.click(checkboxes[0]!);
    expect(updateRow).toHaveBeenCalledWith('rk1', 'isAllowed', expect.any(Boolean));
    // allowAsJudge starts unchecked -> toggling on sends true.
    await user.click(checkboxes[3]!);
    expect(updateRow).toHaveBeenCalledWith('rk1', 'allowAsJudge', true);
  });

  it('forwards override input edits through updateRow', async () => {
    const updateRow = vi.fn();
    const user = userEvent.setup();
    render(<ModelAccessEditor {...makeProps({ updateRow })} />);
    await user.type(screen.getByLabelText('adminPlans.modelAccess.dailyTokenLimitOverride'), '1');
    expect(updateRow).toHaveBeenCalledWith('rk1', 'dailyTokenLimitOverride', expect.any(String));
  });

  it('shows the saving label and disables save while saving', () => {
    render(<ModelAccessEditor {...makeProps({ isSaving: true })} />);
    expect(screen.getByRole('button', { name: 'adminPlans.modelAccess.saving' })).toBeDisabled();
  });

  it('renders the save error alert when provided', () => {
    render(<ModelAccessEditor {...makeProps({ saveErrorMessage: 'save boom' })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('save boom');
  });

  it('invokes onSave and onCancel from the footer buttons', async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<ModelAccessEditor {...makeProps({ onSave, onCancel })} />);
    await user.click(screen.getByRole('button', { name: 'common.save' }));
    expect(onSave).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
