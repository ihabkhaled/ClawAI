import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ThreadGenerationFormController } from '@/types/thread-publication.types';

import { ThreadGenerationForm } from '../thread-generation-form';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function makeForm(
  overrides: Partial<ThreadGenerationFormController> = {},
): ThreadGenerationFormController {
  const model = { provider: 'OLLAMA', model: 'gpt-oss:120b', displayName: 'GPT OSS' };
  return {
    threads: [],
    isLoadingThreads: false,
    isLoadingModels: false,
    availableModels: [model],
    fixedSourceThreadId: null,
    sourceThreadId: 'thread-1',
    setSourceThreadId: vi.fn(),
    topic: 'A sufficiently detailed topic',
    setTopic: vi.fn(),
    publicationType: 'article',
    setPublicationType: vi.fn(),
    contentLocale: 'en',
    setContentLocale: vi.fn(),
    spendCapUsd: '1.00',
    setSpendCapUsd: vi.fn(),
    selectedModels: Array.from({ length: 5 }, () => model),
    changeModel: vi.fn(),
    hasAcknowledgedPublic: false,
    setHasAcknowledgedPublic: vi.fn(),
    hasError: false,
    isStarting: false,
    submit: vi.fn(),
    ...overrides,
  } as ThreadGenerationFormController;
}

describe('ThreadGenerationForm', () => {
  it('keeps the start button disabled until the public-intent box is ticked', () => {
    render(<ThreadGenerationForm form={makeForm()} />);

    expect(screen.getByRole('button', { name: 'chat.threadStartGeneration' })).toBeDisabled();
  });

  it('enables the start button once the owner has acknowledged', () => {
    render(<ThreadGenerationForm form={makeForm({ hasAcknowledgedPublic: true })} />);

    expect(screen.getByRole('button', { name: 'chat.threadStartGeneration' })).toBeEnabled();
  });

  it('records the acknowledgement when the box is ticked', async () => {
    const setHasAcknowledgedPublic = vi.fn();
    render(<ThreadGenerationForm form={makeForm({ setHasAcknowledgedPublic })} />);
    await userEvent.click(screen.getByRole('checkbox'));

    expect(setHasAcknowledgedPublic).toHaveBeenCalledWith(true);
  });

  it('hides the source-chat picker when the chat is fixed', () => {
    render(<ThreadGenerationForm form={makeForm({ fixedSourceThreadId: 'thread-1' })} />);

    expect(screen.queryByText('chat.threadSourceChat')).not.toBeInTheDocument();
  });

  it('shows the source-chat picker on the portal', () => {
    render(<ThreadGenerationForm form={makeForm()} />);

    expect(screen.getByText('chat.threadSourceChat')).toBeInTheDocument();
  });

  it('gives one selector to each of the five model roles', () => {
    render(<ThreadGenerationForm form={makeForm()} />);

    expect(screen.getByLabelText('chat.threadJudgeModel')).toBeInTheDocument();
    expect(screen.getByLabelText('chat.threadCriticModel')).toBeInTheDocument();
    expect(screen.getByLabelText('chat.threadAuthorModel 3')).toBeInTheDocument();
  });
});
