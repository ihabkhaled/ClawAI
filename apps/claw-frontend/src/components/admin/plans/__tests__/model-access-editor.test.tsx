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

  it('shows the saved deployment as the selected option', () => {
    render(
      <ModelAccessEditor
        {...makeProps({
          exposedModels: [{ provider: 'openai', modelKey: 'gpt-4o', displayName: 'GPT-4o' }],
        })}
      />,
    );
    expect((screen.getByLabelText('adminPlans.modelAccess.model') as HTMLSelectElement).value).toBe(
      'openai/gpt-4o',
    );
  });

  it('offers only exposed deployments, never free text', () => {
    // The point of the change: an administrator can no longer type a model id
    // that was never synced. Only what has been exposed is selectable.
    render(
      <ModelAccessEditor
        {...makeProps({
          exposedModels: [{ provider: 'openai', modelKey: 'gpt-4o', displayName: 'GPT-4o' }],
        })}
      />,
    );
    const select = screen.getByLabelText('adminPlans.modelAccess.model') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    // The placeholder plus exactly one exposed deployment.
    expect(select.querySelectorAll('option')).toHaveLength(2);
  });

  it('warns about a saved row whose model is no longer exposed', () => {
    // A legacy or since-unexposed row stays visible so it can be seen and
    // removed, but it is never re-selectable.
    render(<ModelAccessEditor {...makeProps({ exposedModels: [] })} />);
    expect(screen.getByText(/adminPlans.modelAccess.noLongerExposed/)).toBeInTheDocument();
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

  it('sets both provider and model when a deployment is selected', async () => {
    const updateRow = vi.fn();
    const user = userEvent.setup();
    render(
      <ModelAccessEditor
        {...makeProps({
          updateRow,
          exposedModels: [
            { provider: 'openai', modelKey: 'gpt-4o', displayName: 'GPT-4o' },
            { provider: 'anthropic', modelKey: 'claude-opus', displayName: 'Claude Opus' },
          ],
        })}
      />,
    );
    await user.selectOptions(
      screen.getByLabelText('adminPlans.modelAccess.model'),
      'anthropic/claude-opus',
    );
    // One selection carries both halves of the deployment identity, so the two
    // fields can never drift apart the way two free-text boxes could.
    expect(updateRow).toHaveBeenCalledWith('rk1', 'provider', 'anthropic');
    expect(updateRow).toHaveBeenCalledWith('rk1', 'model', 'claude-opus');
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
