import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectorProviderCombobox } from '@/components/connectors/connector-provider-combobox';
import { ConnectorProvider } from '@/enums';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        'connectors.selectProvider': 'Select a provider',
        'connectors.searchProviderPlaceholder': 'Search providers',
        'connectors.noProviderResults': 'No providers found',
        'connectors.groupConnected': 'Connected providers',
        'connectors.groupLowCost': 'Low-cost and fast inference',
        'connectors.groupAggregators': 'Aggregators',
        'connectors.groupDirectLabs': 'Direct model labs',
        'connectors.freeTierBadge': 'Free tier',
      };
      return labels[key] ?? key;
    },
  }),
}));

describe('ConnectorProviderCombobox', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(<ConnectorProviderCombobox value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Select a provider');
  });

  it('shows the selected provider label on the trigger', () => {
    render(<ConnectorProviderCombobox value={ConnectorProvider.GROQ} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Groq');
  });

  it('renders all 4 groups with their headings when opened', () => {
    render(<ConnectorProviderCombobox value={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('Connected providers')).toBeInTheDocument();
    expect(screen.getByText('Low-cost and fast inference')).toBeInTheDocument();
    expect(screen.getByText('Aggregators')).toBeInTheDocument();
    expect(screen.getByText('Direct model labs')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Groq')).toBeInTheDocument();
    expect(screen.getByText('OpenRouter')).toBeInTheDocument();
    expect(screen.getByText('Mistral AI')).toBeInTheDocument();
  });

  it('filters options by the search input', () => {
    render(<ConnectorProviderCombobox value={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByPlaceholderText('Search providers'), {
      target: { value: 'groq' },
    });

    expect(screen.getByText('Groq')).toBeInTheDocument();
    expect(screen.queryByText('OpenRouter')).not.toBeInTheDocument();
  });

  it('shows the no-results label when the search matches nothing', () => {
    render(<ConnectorProviderCombobox value={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByPlaceholderText('Search providers'), {
      target: { value: 'no-such-provider-xyz' },
    });

    expect(screen.getByText('No providers found')).toBeInTheDocument();
  });

  it('calls onChange with the selected provider and closes the popover', () => {
    const onChange = vi.fn();
    render(<ConnectorProviderCombobox value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Groq'));

    expect(onChange).toHaveBeenCalledWith(ConnectorProvider.GROQ);
    expect(screen.queryByText('OpenRouter')).not.toBeInTheDocument();
  });

  it('shows a free-tier badge only for providers with a free tier', () => {
    render(<ConnectorProviderCombobox value={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    const groqRow = screen.getByText('Groq').closest('[cmdk-item]');
    const cerebrasRow = screen.getByText('Cerebras Inference').closest('[cmdk-item]');
    expect(groqRow).toHaveTextContent('Free tier');
    expect(cerebrasRow).not.toHaveTextContent('Free tier');
  });

  it('is keyboard navigable: ArrowDown moves the cmdk highlight', () => {
    render(<ConnectorProviderCombobox value={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = document.querySelector('[cmdk-input]') as Element;

    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(document.querySelector('[cmdk-item][data-selected="true"]')).not.toBeNull();
  });

  it('disables the trigger when disabled is passed (e.g. while editing)', () => {
    render(
      <ConnectorProviderCombobox value={ConnectorProvider.OPENAI} onChange={vi.fn()} disabled />,
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
