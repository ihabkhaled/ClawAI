import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ParallelModelSelector } from '@/components/chat/parallel-model-selector';

vi.mock('@/hooks/chat/use-available-models', () => ({
  useAvailableModels: () => ({
    groupedModels: [
      {
        provider: 'local-ollama',
        label: 'Ollama (Local)',
        models: [
          { provider: 'local-ollama', model: 'qwen3:1.7b', displayName: 'qwen3:1.7b' },
          { provider: 'local-ollama', model: 'gemma3:4b', displayName: 'gemma3:4b' },
        ],
      },
      {
        provider: 'OPENAI',
        label: 'OpenAI',
        models: [{ provider: 'OPENAI', model: 'gpt-4.1', displayName: 'GPT-4.1' }],
      },
      {
        provider: 'IMAGE_OPENAI',
        label: 'OpenAI (Image)',
        models: [{ provider: 'IMAGE_OPENAI', model: 'dall-e-3', displayName: 'DALL-E 3' }],
      },
    ],
    isLoading: false,
  }),
}));

const t = (key: string): string => key;

const baseProps = {
  selectedModels: [],
  onToggleModel: vi.fn(),
  selectionError: null,
  t,
};

describe('ParallelModelSelector — search', () => {
  it('filters visible models by the search query', () => {
    render(<ParallelModelSelector {...baseProps} />);

    expect(screen.getByText('qwen3:1.7b')).toBeInTheDocument();
    expect(screen.getByText('GPT-4.1')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('common.search'), {
      target: { value: 'gpt' },
    });

    expect(screen.getByText('GPT-4.1')).toBeInTheDocument();
    expect(screen.queryByText('qwen3:1.7b')).not.toBeInTheDocument();
    expect(screen.queryByText('gemma3:4b')).not.toBeInTheDocument();
  });

  it('shows the no-results label when the search matches nothing', () => {
    render(<ParallelModelSelector {...baseProps} />);

    fireEvent.change(screen.getByPlaceholderText('common.search'), {
      target: { value: 'no-such-model' },
    });

    expect(screen.getByText('common.noResults')).toBeInTheDocument();
  });

  it('drops a group entirely once search leaves it with zero matches', () => {
    render(<ParallelModelSelector {...baseProps} />);

    fireEvent.change(screen.getByPlaceholderText('common.search'), {
      target: { value: 'gpt' },
    });

    expect(screen.queryByText('Ollama (Local)')).not.toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('never shows IMAGE_* groups regardless of search (pre-existing behavior)', () => {
    render(<ParallelModelSelector {...baseProps} />);
    expect(screen.queryByText('DALL-E 3')).not.toBeInTheDocument();
  });

  it('clearing the search restores every group', () => {
    render(<ParallelModelSelector {...baseProps} />);
    const input = screen.getByPlaceholderText('common.search');

    fireEvent.change(input, { target: { value: 'gpt' } });
    fireEvent.change(input, { target: { value: '' } });

    expect(screen.getByText('qwen3:1.7b')).toBeInTheDocument();
    expect(screen.getByText('gemma3:4b')).toBeInTheDocument();
    expect(screen.getByText('GPT-4.1')).toBeInTheDocument();
  });
});
