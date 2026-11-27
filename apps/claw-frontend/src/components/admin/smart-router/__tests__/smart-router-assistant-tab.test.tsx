import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SmartRouterAssistantTab } from '@/components/admin/smart-router/smart-router-assistant-tab';

const { useAssistantModels } = vi.hoisted(() => ({ useAssistantModels: vi.fn() }));
vi.mock('@/hooks/admin/use-assistant-models', () => ({ useAssistantModels }));
vi.mock('@/components/admin/smart-router/smart-router-assistant-add-form', () => ({
  SmartRouterAssistantAddForm: () => null,
}));

const t = (key: string): string => key;

describe('SmartRouterAssistantTab', () => {
  beforeEach(() => {
    useAssistantModels.mockReset();
  });

  // The harness council asks every member IN PARALLEL and merges their votes;
  // when none answers in time the research gate decides alone, so it sits first.
  it('shows the harness council first, reading its own role, with its parallel-vote copy', () => {
    const entriesByRole: Record<string, readonly object[]> = {
      HARNESS_COUNCIL: [
        {
          id: 'c1',
          order: 1,
          provider: 'OLLAMA_CLOUD',
          modelAlias: 'deepseek-v4.1-flash',
          enabled: true,
          timeoutMs: 8000,
          maxTokens: 512,
          deploymentId: null,
        },
        {
          id: 'c2',
          order: 2,
          provider: 'OLLAMA_CLOUD',
          modelAlias: 'mimo-v2.6-flash',
          enabled: true,
          timeoutMs: 8000,
          maxTokens: 512,
          deploymentId: null,
        },
      ],
      RESEARCH_GATE: [
        {
          id: 'g1',
          order: 1,
          provider: 'GEMINI',
          modelAlias: 'gemini-2.5-flash',
          enabled: true,
          timeoutMs: 5000,
          maxTokens: 256,
          deploymentId: null,
        },
      ],
    };
    useAssistantModels.mockImplementation((role: string) => ({
      entries: entriesByRole[role] ?? [],
      isLoading: false,
      isError: false,
      error: null,
      replace: vi.fn(),
      isReplacePending: false,
    }));

    render(<SmartRouterAssistantTab t={t} />);

    expect(useAssistantModels.mock.calls[0]?.[0]).toBe('HARNESS_COUNCIL');
    const titles = screen.getAllByText(/^smartRouterAdmin\.assistant\.\w+Title$/);
    expect(titles[0]).toHaveTextContent('smartRouterAdmin.assistant.harnessCouncilTitle');
    expect(titles[1]).toHaveTextContent('smartRouterAdmin.assistant.researchGateTitle');
    expect(
      screen.getByText('smartRouterAdmin.assistant.harnessCouncilDescription'),
    ).toBeInTheDocument();
    expect(screen.getByText('deepseek-v4.1-flash')).toBeInTheDocument();
    expect(screen.getByText('mimo-v2.6-flash')).toBeInTheDocument();
    // Council members are asked at once, so none is a "first choice"; the
    // research gate is still tried in order and keeps its badge.
    expect(screen.getAllByText('smartRouterAdmin.assistant.firstChoiceBadge')).toHaveLength(1);
  });

  it('says the research gate decides alone when no council member is configured', () => {
    useAssistantModels.mockImplementation(() => ({
      entries: [],
      isLoading: false,
      isError: false,
      error: null,
      replace: vi.fn(),
      isReplacePending: false,
    }));

    render(<SmartRouterAssistantTab t={t} />);

    expect(useAssistantModels).toHaveBeenCalledWith('HARNESS_COUNCIL');
    expect(screen.getByText('smartRouterAdmin.assistant.harnessCouncilEmpty')).toBeInTheDocument();
  });

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

  // Multimodal batch 9: the read-aloud voice is an admin choice, and an empty
  // role is what dims "Read aloud" for every user.
  it('shows the read-aloud voice section, reading its own role', () => {
    useAssistantModels.mockImplementation((role: string) => ({
      entries:
        role === 'TTS_VOICE'
          ? [
              {
                id: 'tts1',
                order: 1,
                provider: 'GEMINI',
                modelAlias: 'gemini-2.5-flash-preview-tts',
                enabled: true,
                timeoutMs: 60000,
                maxTokens: 4096,
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

    expect(useAssistantModels).toHaveBeenCalledWith('TTS_VOICE');
    expect(screen.getByText('smartRouterAdmin.assistant.ttsVoiceTitle')).toBeInTheDocument();
    expect(screen.getByText('smartRouterAdmin.assistant.ttsVoiceDescription')).toBeInTheDocument();
    expect(screen.getByText('gemini-2.5-flash-preview-tts')).toBeInTheDocument();
  });

  it('says read aloud stays dimmed when no voice is configured', () => {
    useAssistantModels.mockImplementation(() => ({
      entries: [],
      isLoading: false,
      isError: false,
      error: null,
      replace: vi.fn(),
      isReplacePending: false,
    }));

    render(<SmartRouterAssistantTab t={t} />);

    expect(screen.getByText('smartRouterAdmin.assistant.ttsVoiceEmpty')).toBeInTheDocument();
  });
});
