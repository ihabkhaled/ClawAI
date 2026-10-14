import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type {
  ThreadDeleteController,
  ThreadRetryFormController,
} from '@/types/thread-generation-progress.types';

import { ThreadGenerationDeleteDialog } from '../thread-generation-delete-dialog';
import { ThreadGenerationRetryForm } from '../thread-generation-retry-form';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../thread-model-picker', () => ({
  ThreadModelPicker: ({
    label,
    onChange,
  }: {
    label: string;
    onChange: (model: { provider: string; model: string; displayName: string }) => void;
  }) => (
    <button
      type="button"
      data-testid="role-picker"
      onClick={() => onChange({ provider: 'OLLAMA', model: 'm', displayName: 'M' })}
    >
      {label}
    </button>
  ),
}));

function makeRetry(overrides: Partial<ThreadRetryFormController> = {}): ThreadRetryFormController {
  return {
    isOpen: true,
    open: vi.fn(),
    close: vi.fn(),
    topic: 'A long enough topic',
    isTopicLongEnough: true,
    isTopicTooShort: false,
    setTopic: vi.fn(),
    spendCapUsd: '1',
    setSpendCapUsd: vi.fn(),
    roles: [
      {
        roleId: 'author-1',
        roleKind: 'AUTHOR',
        model: { provider: 'OPENAI', model: 'a', displayName: 'A' },
      },
    ],
    changeModel: vi.fn(),
    submit: vi.fn(),
    isSubmitting: false,
    error: null,
    ...overrides,
  };
}

function makeDelete(overrides: Partial<ThreadDeleteController> = {}): ThreadDeleteController {
  return {
    isOpen: true,
    setOpen: vi.fn(),
    confirm: vi.fn(),
    isDeleting: false,
    error: null,
    ...overrides,
  };
}

describe('ThreadGenerationRetryForm', () => {
  it('bounds the spend cap input between 0.01 and 1000', () => {
    render(<ThreadGenerationRetryForm form={makeRetry()} />);

    const input = screen.getByLabelText('chat.threadSpendCapUsd');
    expect(input).toHaveAttribute('min', '0.01');
    expect(input).toHaveAttribute('max', '1000');
  });

  it('edits topic and cap, picks a model per role and submits', async () => {
    const user = userEvent.setup();
    const form = makeRetry();
    render(<ThreadGenerationRetryForm form={form} />);

    await user.type(screen.getByLabelText('chat.threadTopic'), '!');
    await user.type(screen.getByLabelText('chat.threadSpendCapUsd'), '5');
    await user.click(screen.getByTestId('role-picker'));
    await user.click(screen.getByRole('button', { name: 'chat.threadProgress.retrySubmit' }));

    expect(form.setTopic).toHaveBeenCalled();
    expect(form.setSpendCapUsd).toHaveBeenCalled();
    expect(form.changeModel).toHaveBeenCalledWith('author-1', {
      provider: 'OLLAMA',
      model: 'm',
      displayName: 'M',
    });
    expect(form.submit).toHaveBeenCalledTimes(1);
  });

  it('shows the error and closes on cancel', async () => {
    const user = userEvent.setup();
    const form = makeRetry({ error: { key: 'chat.threadProgress.error.credit' } });
    render(<ThreadGenerationRetryForm form={form} />);

    expect(screen.getByRole('alert')).toHaveTextContent('chat.threadProgress.error.credit');
    await user.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(form.close).toHaveBeenCalled();
  });

  it('opens and closes through the dialog state', async () => {
    const user = userEvent.setup();
    const form = makeRetry();
    render(<ThreadGenerationRetryForm form={form} />);

    await user.keyboard('{Escape}');

    expect(form.close).toHaveBeenCalled();
  });

  it('renders nothing while closed', () => {
    render(<ThreadGenerationRetryForm form={makeRetry({ isOpen: false })} />);
    expect(screen.queryByText('chat.threadProgress.retryTitle')).not.toBeInTheDocument();
  });
});

describe('ThreadGenerationDeleteDialog', () => {
  it('asks for confirmation and deletes on confirm', async () => {
    const user = userEvent.setup();
    const remove = makeDelete();
    render(<ThreadGenerationDeleteDialog remove={remove} />);

    expect(screen.getByText('chat.threadProgress.deleteBody')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'chat.threadProgress.deleteConfirm' }));
    expect(remove.confirm).toHaveBeenCalledTimes(1);
  });

  it('cancels without deleting and shows a refusal', async () => {
    const user = userEvent.setup();
    const remove = makeDelete({ error: { key: 'chat.threadProgress.error.notFound' } });
    render(<ThreadGenerationDeleteDialog remove={remove} />);

    expect(screen.getByRole('alert')).toHaveTextContent('chat.threadProgress.error.notFound');
    await user.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(remove.setOpen).toHaveBeenCalledWith(false);
    expect(remove.confirm).not.toHaveBeenCalled();
  });
});
