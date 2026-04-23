import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdvancedModuleModelSelector } from '@/components/chat/advanced-module-model-selector';

vi.mock('@/hooks/chat/use-available-models', () => ({
  useAvailableModels: () => ({
    groupedModels: [
      {
        provider: 'local-ollama',
        label: 'Ollama (Local)',
        models: [
          {
            provider: 'local-ollama',
            model: 'qwen2.5:7b',
            displayName: 'qwen2.5:7b',
          },
        ],
      },
      {
        provider: 'OPENAI',
        label: 'OpenAI',
        models: [
          {
            provider: 'OPENAI',
            model: 'gpt-4.1',
            displayName: 'GPT-4.1',
          },
        ],
      },
    ],
    isLoading: false,
  }),
}));

const t = (key: string) => key;

describe('AdvancedModuleModelSelector', () => {
  it('renders the shared selector label and local-model helper text', () => {
    render(<AdvancedModuleModelSelector t={t} value={null} onChange={vi.fn()} />);

    expect(screen.getByText('advancedModelSelector.label')).toBeInTheDocument();
    expect(screen.getByText('advancedModelSelector.description')).toBeInTheDocument();
  });

  it('emits the selected local model', () => {
    const onChange = vi.fn();
    render(<AdvancedModuleModelSelector t={t} value={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('qwen2.5:7b'));

    expect(onChange).toHaveBeenCalledWith({
      provider: 'local-ollama',
      model: 'qwen2.5:7b',
      displayName: 'qwen2.5:7b',
    });
  });
});
