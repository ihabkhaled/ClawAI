import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { InThreadComparePanel } from '@/components/chat/in-thread-compare-panel';
import { CompareResearchMode } from '@/enums';

// The compare panel mounts FileAttachmentPicker, which transitively calls
// useTranslation() (LocaleProvider-backed) plus useFiles()/useUploadFile().
// In this unit test we don't render a LocaleProvider, so mock those modules.
vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/hooks/files/use-files', () => ({
  useFiles: () => ({ files: [], isLoading: false, isError: false, error: null }),
}));

vi.mock('@/hooks/files/use-upload-file', () => ({
  useUploadFile: () => ({ uploadFile: vi.fn(), isPending: false }),
}));

const t = (key: string): string => key;

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  selectedModels: [],
  onToggleModel: vi.fn(),
  prompt: '',
  onPromptChange: vi.fn(),
  onSend: vi.fn(),
  result: undefined,
  isPending: false,
  canSend: false,
  judgeEnabled: false,
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
  researchMode: CompareResearchMode.NONE,
  onResearchModeChange: vi.fn(),
  selectedFileIds: [],
  onSelectedFileIdsChange: vi.fn(),
  onIngestFiles: vi.fn(),
  t,
};

function withQueryClient(children: ReactNode): ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('InThreadComparePanel — plan-feature gates', () => {
  it('hides judge controls when allowJudgeMode is false', () => {
    render(
      withQueryClient(
        <InThreadComparePanel {...baseProps} allowJudgeMode={false} allowResearchMode />,
      ),
    );
    expect(screen.queryByText('chat.judgeReferee')).not.toBeInTheDocument();
  });

  it('hides research controls when allowResearchMode is false', () => {
    render(
      withQueryClient(
        <InThreadComparePanel {...baseProps} allowJudgeMode allowResearchMode={false} />,
      ),
    );
    expect(screen.queryByText('compare.research.label')).not.toBeInTheDocument();
  });

  it('shows both judge + research controls when plan unlocks both', () => {
    render(
      withQueryClient(<InThreadComparePanel {...baseProps} allowJudgeMode allowResearchMode />),
    );
    expect(screen.getByText('chat.judgeReferee')).toBeInTheDocument();
    expect(screen.getByText('compare.research.label')).toBeInTheDocument();
  });

  it('hides BOTH judge + research controls when plan locks both', () => {
    render(
      withQueryClient(
        <InThreadComparePanel {...baseProps} allowJudgeMode={false} allowResearchMode={false} />,
      ),
    );
    expect(screen.queryByText('chat.judgeReferee')).not.toBeInTheDocument();
    expect(screen.queryByText('compare.research.label')).not.toBeInTheDocument();
  });

  it('hides Critic controls when allowCriticReview is false even with judge enabled', () => {
    render(
      withQueryClient(
        <InThreadComparePanel
          {...baseProps}
          allowJudgeMode
          allowResearchMode
          judgeEnabled
          allowCriticReview={false}
        />,
      ),
    );
    expect(screen.queryByText('compare.critic.enabled')).not.toBeInTheDocument();
  });

  it('hides Critic controls when allowCriticReview=true but judge is off (UI rule)', () => {
    render(
      withQueryClient(
        <InThreadComparePanel
          {...baseProps}
          allowJudgeMode
          allowResearchMode
          judgeEnabled={false}
          allowCriticReview
        />,
      ),
    );
    expect(screen.queryByText('compare.critic.enabled')).not.toBeInTheDocument();
  });

  it('shows Critic controls when allowCriticReview AND judgeEnabled are both true', () => {
    render(
      withQueryClient(
        <InThreadComparePanel
          {...baseProps}
          allowJudgeMode
          allowResearchMode
          judgeEnabled
          allowCriticReview
        />,
      ),
    );
    expect(screen.getByText('compare.critic.enabled')).toBeInTheDocument();
  });
});

describe('InThreadComparePanel — prompt textarea parity', () => {
  it('stacks the prompt and submit action on narrow screens', () => {
    render(
      withQueryClient(<InThreadComparePanel {...baseProps} allowJudgeMode allowResearchMode />),
    );

    const submit = screen.getByRole('button', { name: 'compare.sendPrompt' });
    expect(submit).toHaveClass('w-full', 'sm:w-auto');
    expect(submit.closest('form')).toHaveClass('flex-col', 'sm:flex-row', 'min-w-0');
  });

  it('typing into the prompt textarea calls onPromptChange with the new value', () => {
    const onPromptChange = vi.fn();
    render(
      withQueryClient(
        <InThreadComparePanel
          {...baseProps}
          allowJudgeMode
          allowResearchMode
          prompt=""
          onPromptChange={onPromptChange}
        />,
      ),
    );
    const textarea = screen.getByLabelText('compare.sendPrompt');
    fireEvent.change(textarea, { target: { value: 'hello compare' } });
    expect(onPromptChange).toHaveBeenCalledWith('hello compare');
  });

  it('pressing Enter on the prompt textarea triggers onSend (with non-empty value, not pending)', () => {
    const onSend = vi.fn();
    render(
      withQueryClient(
        <InThreadComparePanel
          {...baseProps}
          allowJudgeMode
          allowResearchMode
          prompt="please compare these"
          canSend
          isPending={false}
          onSend={onSend}
        />,
      ),
    );
    const textarea = screen.getByLabelText('compare.sendPrompt');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('Shift+Enter does NOT trigger onSend (falls through to newline)', () => {
    const onSend = vi.fn();
    render(
      withQueryClient(
        <InThreadComparePanel
          {...baseProps}
          allowJudgeMode
          allowResearchMode
          prompt="please compare these"
          canSend
          isPending={false}
          onSend={onSend}
        />,
      ),
    );
    const textarea = screen.getByLabelText('compare.sendPrompt');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });
});
