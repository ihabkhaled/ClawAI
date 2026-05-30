import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ThreadSettings } from '@/components/chat/thread-settings';

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
    render(
      withQueryClient(<ThreadSettings {...baseProps} allowJudgeMode judgeEnabled={false} />),
    );
    expect(screen.queryByText('chat.judgeModelLabel')).not.toBeInTheDocument();
  });
});
