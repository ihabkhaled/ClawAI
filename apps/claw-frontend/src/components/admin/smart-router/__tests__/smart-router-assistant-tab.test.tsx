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

  // ADR-120 batch 5: the image-describing helper is an admin choice too (rule 51
  // item 7: a new helper model gets a role, not a constant).
  it('shows the vision helper section, reading its own role', () => {
    useAssistantModels.mockImplementation((role: string) => ({
      entries:
        role === 'VISION_HELPER'
          ? [
              {
                id: 'v1',
                order: 1,
                provider: 'GEMINI',
                modelAlias: 'gemini-2.5-flash',
                enabled: true,
                timeoutMs: 30000,
                maxTokens: 1024,
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

    expect(useAssistantModels).toHaveBeenCalledWith('VISION_HELPER');
    expect(screen.getByText('smartRouterAdmin.assistant.visionHelperTitle')).toBeInTheDocument();
    expect(
      screen.getByText('smartRouterAdmin.assistant.visionHelperDescription'),
    ).toBeInTheDocument();
    expect(screen.getByText('gemini-2.5-flash')).toBeInTheDocument();
  });

  it('says what happens when no vision helper is configured', () => {
    useAssistantModels.mockImplementation(() => ({
      entries: [],
      isLoading: false,
      isError: false,
      error: null,
      replace: vi.fn(),
      isReplacePending: false,
    }));

    render(<SmartRouterAssistantTab t={t} />);

    expect(screen.getByText('smartRouterAdmin.assistant.visionHelperEmpty')).toBeInTheDocument();
  });
});
