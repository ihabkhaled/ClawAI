import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OrchestrationSingleModelSelect } from '@/components/chat/orchestration/orchestration-single-model-select';

const groupedModelsMock = vi.fn();

vi.mock('@/hooks/chat/use-available-models', () => ({
  useAvailableModels: () => groupedModelsMock(),
}));

const t = (key: string): string => key;

describe('OrchestrationSingleModelSelect', () => {
  it('shows cloud/connector models, not just local-ollama (regression: was hardcoded to local-ollama only)', () => {
    groupedModelsMock.mockReturnValue({
      groupedModels: [
        {
          provider: 'local-ollama',
          label: 'Ollama (Local)',
          models: [{ provider: 'local-ollama', model: 'qwen3:1.7b', displayName: 'qwen3:1.7b' }],
        },
        {
          provider: 'OPENAI',
          label: 'OpenAI',
          models: [{ provider: 'OPENAI', model: 'gpt-4.1', displayName: 'GPT-4.1' }],
        },
      ],
      isLoading: false,
    });

    render(<OrchestrationSingleModelSelect value={null} onChange={vi.fn()} t={t} />);
    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('qwen3:1.7b')).toBeInTheDocument();
    expect(screen.getByText('GPT-4.1')).toBeInTheDocument();
  });

  it('shows the empty placeholder only when every provider has zero models, not just local-ollama', () => {
    groupedModelsMock.mockReturnValue({
      groupedModels: [
        { provider: 'local-ollama', label: 'Ollama (Local)', models: [] },
        {
          provider: 'OPENAI',
          label: 'OpenAI',
          models: [{ provider: 'OPENAI', model: 'gpt-4.1', displayName: 'GPT-4.1' }],
        },
      ],
      isLoading: false,
    });

    render(<OrchestrationSingleModelSelect value={null} onChange={vi.fn()} t={t} />);

    expect(screen.getByRole('combobox')).not.toBeDisabled();
    expect(screen.getByText('advancedModelSelector.description')).toBeInTheDocument();
  });

  it('emits the selected model regardless of which provider it came from', () => {
    groupedModelsMock.mockReturnValue({
      groupedModels: [
        {
          provider: 'OPENAI',
          label: 'OpenAI',
          models: [{ provider: 'OPENAI', model: 'gpt-4.1', displayName: 'GPT-4.1' }],
        },
      ],
      isLoading: false,
    });
    const onChange = vi.fn();

    render(<OrchestrationSingleModelSelect value={null} onChange={onChange} t={t} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('GPT-4.1'));

    expect(onChange).toHaveBeenCalledWith({
      provider: 'OPENAI',
      model: 'gpt-4.1',
      displayName: 'GPT-4.1',
    });
  });

  it('has no Auto option — every orchestration lab requires an explicit model', () => {
    groupedModelsMock.mockReturnValue({
      groupedModels: [
        {
          provider: 'OPENAI',
          label: 'OpenAI',
          models: [{ provider: 'OPENAI', model: 'gpt-4.1', displayName: 'GPT-4.1' }],
        },
      ],
      isLoading: false,
    });

    render(<OrchestrationSingleModelSelect value={null} onChange={vi.fn()} t={t} />);
    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.queryByText('advancedModelSelector.auto')).not.toBeInTheDocument();
  });
});
