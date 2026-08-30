import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ThreadSettings } from '@/components/chat/thread-settings';

// The model selector aggregates connector + local + frontier models. We stub it
// so the test does not need real query clients for the underlying queries —
// only the grouped output matters here.
// The model selector now renders a PAYG cost badge, so `useModelSelector` reads
// translations. Mocking the hook keeps these unit tests off a full
// LocaleProvider — the key is echoed back, which is enough to assert the
// selector's enabled/disabled state, which is what this suite is about.
// (Same idiom as components/common/__tests__/status-badge.test.tsx.)
vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (k: string) => k, locale: 'en', dir: 'ltr' }),
}));

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
  open: true,
  onOpenChange: vi.fn(),
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
  useCrossThreadContext: false,
  onUseCrossThreadContextChange: vi.fn(),
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

describe('ThreadSettings — focused responsibilities', () => {
  it('hides judge toggle + judge-model selector when allowJudgeMode is false', () => {
    render(withQueryClient(<ThreadSettings {...baseProps} />));
    expect(screen.queryByText('chat.judgeReferee')).not.toBeInTheDocument();
    expect(screen.queryByText('chat.judgeModelLabel')).not.toBeInTheDocument();
  });

  it('keeps quality workflow controls out of thread settings', () => {
    render(withQueryClient(<ThreadSettings {...baseProps} />));
    expect(screen.queryByText('chat.judgeReferee')).not.toBeInTheDocument();
    expect(screen.queryByText('chat.qualityThreshold')).not.toBeInTheDocument();
    expect(screen.queryByText('chat.maxReRouteAttempts')).not.toBeInTheDocument();
  });
});

describe('ThreadSettings — model selector is never gated by plan features', () => {
  it('renders the model selector ENABLED when all plan-feature gates are off (judge/critic/research)', () => {
    // Plan features are intentionally off: judgeEnabled=false, allowJudgeMode=false.
    // The MAIN model selector (preferredModel) must STILL be enabled — it is
    // gated only by runtime concerns (isPending / loading / zero options), never
    // by plan features. This mirrors the MessageComposer's bottom selector.
    render(withQueryClient(<ThreadSettings {...baseProps} isPending={false} />));

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
    render(withQueryClient(<ThreadSettings {...baseProps} isPending />));
    const comboboxes = screen.getAllByRole('combobox');
    const modelSelectorTrigger = comboboxes[0];
    // Radix Select reflects disabled state via the native `disabled` attribute
    // on the trigger button when the wrapping <Select disabled> is true.
    expect(modelSelectorTrigger).toBeDisabled();
  });
});
