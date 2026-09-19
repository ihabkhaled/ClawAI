import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SmartRouterAssistantTab } from '@/components/admin/smart-router/smart-router-assistant-tab';

const { useAssistantModels } = vi.hoisted(() => ({ useAssistantModels: vi.fn() }));
vi.mock('@/hooks/admin/use-assistant-models', () => ({ useAssistantModels }));
vi.mock('@/components/admin/smart-router/smart-router-assistant-add-form', () => ({
  SmartRouterAssistantAddForm: () => null,
}));

const t = (key: string): string => key;

describe('SmartRouterAssistantTab', () => {
  // The file writer models used to be hard-coded; they are an admin choice now.
  it('shows the research gate and the file writer, each with its own role', () => {
    useAssistantModels.mockImplementation((role: string) => ({
      entries:
        role === 'FILE_WRITER'
          ? [
              {
                id: 'w1',
                order: 1,
                provider: 'OLLAMA_CLOUD',
                modelAlias: 'gpt-oss:120b',
                enabled: true,
                timeoutMs: 120000,
                maxTokens: 8192,
                deploymentId: null,
              },
            ]
          : [],
      isLoading: false,
      isError: false,
      error: null,
      replace: vi.fn(),
      isReplacePending: false,
    }));

    render(<SmartRouterAssistantTab t={t} />);

    expect(useAssistantModels).toHaveBeenCalledWith('RESEARCH_GATE');
    expect(useAssistantModels).toHaveBeenCalledWith('FILE_WRITER');
    expect(screen.getByText('smartRouterAdmin.assistant.fileWriterTitle')).toBeInTheDocument();
    expect(screen.getByText('gpt-oss:120b')).toBeInTheDocument();
    expect(screen.getByText('smartRouterAdmin.assistant.emptyMeansDisabled')).toBeInTheDocument();
  });
});
