import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ModelPicker } from '@/components/chat/model-picker';
import type { ModelPickerGroup } from '@/types';

const groups: ModelPickerGroup[] = [
  {
    key: 'local-ollama',
    label: 'Ollama (Local)',
    options: [
      { value: 'local-ollama::qwen3:1.7b', label: 'qwen3:1.7b' },
      { value: 'local-ollama::gemma3:4b', label: 'gemma3:4b' },
    ],
  },
  {
    key: 'OPENAI',
    label: 'OpenAI',
    options: [{ value: 'OPENAI::gpt-4.1', label: 'GPT-4.1' }],
  },
];

const baseProps = {
  groups,
  value: null,
  onChange: vi.fn(),
  placeholder: 'Auto',
  loadingPlaceholder: 'Loading...',
  emptyPlaceholder: 'No models available',
  searchPlaceholder: 'Search',
  noResultsLabel: 'No results found',
};

describe('ModelPicker', () => {
  // The trigger is 36px square in the mobile composer, and a phone relaxes
  // `.truncate` to wrap so a clipped string stays readable. Together those
  // rendered "Auto (routing decides)" as six stacked syllables spilling out of
  // the button. An icon-only trigger keeps the label for a screen reader only.
  it('keeps the label out of the trigger but not out of the accessibility tree', () => {
    render(
      <ModelPicker {...baseProps} value="OPENAI::gpt-4.1" hideTriggerLabel ariaLabel="Model" />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Model' });
    expect(trigger).toHaveTextContent('GPT-4.1');
    expect(trigger.querySelector('.sr-only')).not.toBeNull();
    expect(trigger.querySelector('.truncate-fixed')).toBeNull();
  });

  it('clips rather than wraps the label when the trigger does show one', () => {
    render(<ModelPicker {...baseProps} value="OPENAI::gpt-4.1" />);

    const label = screen.getByRole('combobox').querySelector('.truncate-fixed');
    expect(label).not.toBeNull();
    expect(label).toHaveTextContent('GPT-4.1');
  });

  it('shows every group when opened, not just one provider', () => {
    render(<ModelPicker {...baseProps} />);
    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('qwen3:1.7b')).toBeInTheDocument();
    expect(screen.getByText('gemma3:4b')).toBeInTheDocument();
    expect(screen.getByText('GPT-4.1')).toBeInTheDocument();
    expect(screen.getByText('Ollama (Local)')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('calls onChange with the selected value and closes the popover', () => {
    const onChange = vi.fn();
    render(<ModelPicker {...baseProps} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('GPT-4.1'));

    expect(onChange).toHaveBeenCalledWith('OPENAI::gpt-4.1');
    expect(screen.queryByText('qwen3:1.7b')).not.toBeInTheDocument();
  });

  it('filters options by the search input', () => {
    render(<ModelPicker {...baseProps} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'gpt' } });

    expect(screen.getByText('GPT-4.1')).toBeInTheDocument();
    expect(screen.queryByText('qwen3:1.7b')).not.toBeInTheDocument();
    expect(screen.queryByText('gemma3:4b')).not.toBeInTheDocument();
  });

  it('shows the noResultsLabel when the search matches nothing', () => {
    render(<ModelPicker {...baseProps} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByPlaceholderText('Search'), {
      target: { value: 'no-such-model' },
    });

    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('renders a pinned autoOption above every group', () => {
    render(
      <ModelPicker
        {...baseProps}
        autoOption={{ value: '__auto__', label: 'Auto (routing decides)' }}
      />,
    );
    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('Auto (routing decides)')).toBeInTheDocument();
  });

  it('shows the loading placeholder and disables the trigger while loading', () => {
    render(<ModelPicker {...baseProps} isLoading />);

    expect(screen.getByRole('combobox')).toHaveTextContent('Loading...');
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('shows the empty placeholder and disables the trigger when there are no models', () => {
    render(<ModelPicker {...baseProps} groups={[]} />);

    expect(screen.getByRole('combobox')).toHaveTextContent('No models available');
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('is not disabled when empty groups are offset by an autoOption', () => {
    render(
      <ModelPicker
        {...baseProps}
        groups={[]}
        autoOption={{ value: '__auto__', label: 'Auto (routing decides)' }}
      />,
    );

    expect(screen.getByRole('combobox')).not.toBeDisabled();
  });

  it('shows the selected option label on the trigger', () => {
    render(<ModelPicker {...baseProps} value="OPENAI::gpt-4.1" />);

    expect(screen.getByRole('combobox')).toHaveTextContent('GPT-4.1');
  });
});
