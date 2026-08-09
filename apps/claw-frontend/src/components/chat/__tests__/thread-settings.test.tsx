import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ThreadSettings } from '@/components/chat/thread-settings';

// The model selector aggregates connector + local + frontier models. We stub it
// so the test does not need real query clients for the underlying queries —
// only the grouped output matters here.
vi.mock('@/hooks/chat/use-available-models', () => ({
  useAvailableModels: () => ({
    groupedModels: [
      {
        provider: 'OPENAI',
        label: 'OpenAI',
        models: [{ provider: 'OPENAI', model: 'gpt-4.1', displayName: 'GPT-4.1' }],
      },
    ],
    isLoading: false,
  }),
}));

const t = (key: string): string => key;

const baseProps = {
  t,
  systemPrompt: '',
  onSystemPromptChange: vi.fn(),
  temperature: 0.7,
  onTemperatureChange: vi.fn(),
  maxTokens: '32000',
  onMaxTokensChange: vi.fn(),
  selectedModel: null,
  onModelChange: vi.fn(),
  contextPackIds: [],
  onContextPackIdsChange: vi.fn(),
  judgeEnabled: true,
  onJudgeEnabledChange: vi.fn(),
  judgeModel: null,
  onJudgeModelChange: vi.fn(),
  judgeModelOptions: [],
  judgeModelOptionsLoading: false,
  criticEnabled: false,
  onCriticEnabledChange: vi.fn(),
  criticModel: null,
  onCriticModelChange: vi.fn(),
  allowCriticReview: false,
  criticEnablementDisabled: false,
  qualityThreshold: 0.7,
  onQualityThresholdChange: vi.fn(),
  maxReRouteAttempts: 0,
  onMaxReRouteAttemptsChange: vi.fn(),
  useMemory: true,
  onUseMemoryChange: vi.fn(),
  useContext: true,
  onUseContextChange: vi.fn(),
  onSave: vi.fn(),
  isPending: false,
  maxTokensError: null,
  canSave: true,
};

function withQueryClient(children: ReactNode): ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('ThreadSettings — plan-feature gate (judge mode)', () => {
  it('hides judge toggle + judge-model selector when allowJudgeMode is false', () => {
    render(withQueryClient(<ThreadSettings {...baseProps} allowJudgeMode={false} />));
    expect(screen.queryByText('chat.judgeReferee')).not.toBeInTheDocument();
    expect(screen.queryByText('chat.judgeModelLabel')).not.toBeInTheDocument();
  });

  it('shows judge toggle when allowJudgeMode is true', () => {
    render(withQueryClient(<ThreadSettings {...baseProps} allowJudgeMode />));
    expect(screen.getByText('chat.judgeReferee')).toBeInTheDocument();
  });

  it('shows judge-model selector when allowJudgeMode is true AND judgeEnabled is true', () => {
    render(withQueryClient(<ThreadSettings {...baseProps} allowJudgeMode judgeEnabled />));
    expect(screen.getByText('chat.judgeModelLabel')).toBeInTheDocument();
  });

  it('hides judge-model selector when allowJudgeMode is true but judgeEnabled is false', () => {
    render(withQueryClient(<ThreadSettings {...baseProps} allowJudgeMode judgeEnabled={false} />));
    expect(screen.queryByText('chat.judgeModelLabel')).not.toBeInTheDocument();
  });
});

describe('ThreadSettings — critic controls', () => {
  it('shows critic controls only when both plan gates and judge mode are enabled', () => {
    render(
      withQueryClient(
        <ThreadSettings {...baseProps} allowJudgeMode allowCriticReview judgeEnabled />,
      ),
    );

    expect(screen.getByText('compare.critic.enabled')).toBeInTheDocument();
  });

  it('hides critic controls when critic review is unavailable', () => {
    render(
      withQueryClient(
        <ThreadSettings {...baseProps} allowJudgeMode judgeEnabled allowCriticReview={false} />,
      ),
    );

    expect(screen.queryByText('compare.critic.enabled')).not.toBeInTheDocument();
  });

  it('shows the critic model selector only after critic review is enabled', () => {
    render(
      withQueryClient(
        <ThreadSettings
          {...baseProps}
          allowJudgeMode
          allowCriticReview
          judgeEnabled
          criticEnabled
        />,
      ),
    );

    expect(screen.getByText('compare.critic.modelLabel')).toBeInTheDocument();
  });

  it('disables critic enablement when no concrete model is available', () => {
    render(
      withQueryClient(
        <ThreadSettings
          {...baseProps}
          allowJudgeMode
          allowCriticReview
          judgeEnabled
          judgeModelOptions={[]}
          criticEnablementDisabled
        />,
      ),
    );

    expect(screen.getByRole('switch', { name: 'compare.critic.enabled' })).toBeDisabled();
  });
});

describe('ThreadSettings — model selector is never gated by plan features', () => {
  it('renders the model selector ENABLED when all plan-feature gates are off (judge/critic/research)', () => {
    // Plan features are intentionally off: judgeEnabled=false, allowJudgeMode=false.
    // The MAIN model selector (preferredModel) must STILL be enabled — it is
    // gated only by runtime concerns (isPending / loading / zero options), never
    // by plan features. This mirrors the MessageComposer's bottom selector.
    render(
      withQueryClient(
        <ThreadSettings
          {...baseProps}
          allowJudgeMode={false}
          judgeEnabled={false}
          isPending={false}
        />,
      ),
    );

    // The first combobox in the rendered output is the preferred-model selector.
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThan(0);
    const modelSelectorTrigger = comboboxes[0];
    // Radix Select renders the trigger as a <button>; an enabled trigger has
    // neither the native `disabled` attribute nor Radix's `data-disabled`.
    expect(modelSelectorTrigger).not.toBeDisabled();
    expect(modelSelectorTrigger).not.toHaveAttribute('data-disabled');
  });

  it('renders the model selector DISABLED only while the save mutation is pending', () => {
    render(withQueryClient(<ThreadSettings {...baseProps} allowJudgeMode={false} isPending />));
    const comboboxes = screen.getAllByRole('combobox');
    const modelSelectorTrigger = comboboxes[0];
    // Radix Select reflects disabled state via the native `disabled` attribute
    // on the trigger button when the wrapping <Select disabled> is true.
    expect(modelSelectorTrigger).toBeDisabled();
  });
});
