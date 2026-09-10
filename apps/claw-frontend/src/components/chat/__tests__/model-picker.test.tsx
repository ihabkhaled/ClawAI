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
  // The trigger was once a 36px square whose only label was `sr-only`, because
  // a phone relaxes `.truncate` to wrap and "Auto (routing decides)" rendered
  // as six stacked syllables spilling out of the button. Hiding the name was
  // the wrong half of that trade: on a phone the header does not repeat it, so
  // nothing on screen said which model would answer. A bounded width plus
  // `truncate-fixed` solves both.
  it('always renders a visible, trimmed label rather than an sr-only one', () => {
    render(<ModelPicker {...baseProps} value="OPENAI::gpt-4.1" ariaLabel="Model" />);

    const trigger = screen.getByRole('combobox', { name: 'Model' });
    expect(trigger).toHaveTextContent('GPT-4.1');
    expect(trigger.querySelector('.sr-only')).toBeNull();
    expect(trigger.querySelector('.truncate-fixed')).not.toBeNull();
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

  it('opens with the current choice highlighted, not the top of the list', () => {
    // The reason this matters: the real list is ~180 rows. It used to open at
    // scroll position zero every time, so a model near the bottom had to be
    // scrolled back to on every visit. cmdk scrolls its highlighted row into
    // view, so seeding the highlight IS the scroll behaviour.
    render(<ModelPicker {...baseProps} value="OPENAI::gpt-4.1" />);
    fireEvent.click(screen.getByRole('combobox'));

    const highlighted = document.querySelector('[cmdk-item][data-selected="true"]');
    expect(highlighted).toHaveTextContent('GPT-4.1');
  });

  it('highlights the auto option when nothing has been chosen yet', () => {
    render(
      <ModelPicker
        {...baseProps}
        autoOption={{ value: '__auto__', label: 'Auto (routing decides)' }}
        value="__auto__"
      />,
    );
    fireEvent.click(screen.getByRole('combobox'));

    const highlighted = document.querySelector('[cmdk-item][data-selected="true"]');
    expect(highlighted).toHaveTextContent('Auto (routing decides)');
  });

  it('re-seeds the highlight each time it opens, so it never drifts', () => {
    render(<ModelPicker {...baseProps} value="local-ollama::gemma3:4b" />);
    const trigger = screen.getByRole('combobox');

    fireEvent.click(trigger);
    fireEvent.keyDown(document.querySelector('[cmdk-input]') as Element, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'Escape' });
    fireEvent.click(trigger);

    const highlighted = document.querySelector('[cmdk-item][data-selected="true"]');
    expect(highlighted).toHaveTextContent('gemma3:4b');
  });

  it('still finds a model by its display name after the value became the id', () => {
    // The cmdk item value had to become the option's own value so the highlight
    // could be seeded by identity. The label moved to `keywords`; without it,
    // typing a model name would match nothing.
    render(<ModelPicker {...baseProps} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'gemma' } });

    expect(screen.getByText('gemma3:4b')).toBeInTheDocument();
    expect(screen.queryByText('GPT-4.1')).not.toBeInTheDocument();
  });

  it('shows the short label on a narrow trigger and the full one everywhere else', () => {
    // A phone trigger has a few rem. Showing nothing at all was the old
    // behaviour, and it left no indication anywhere on screen of which model
    // would answer.
    render(
      <ModelPicker
        {...baseProps}
        autoOption={{
          value: '__auto__',
          label: 'Auto (routing decides)',
          shortLabel: 'Auto',
        }}
        value="__auto__"
        useShortTriggerLabel
      />,
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveTextContent('Auto');
    expect(trigger).not.toHaveTextContent('routing decides');
    expect(trigger).toHaveAttribute('title', 'Auto (routing decides)');
    expect(trigger).toHaveAttribute('aria-label', 'Auto (routing decides)');
  });

  it('falls back to the full label when an option has no short one', () => {
    render(<ModelPicker {...baseProps} value="OPENAI::gpt-4.1" useShortTriggerLabel />);

    expect(screen.getByRole('combobox')).toHaveTextContent('GPT-4.1');
  });
});
