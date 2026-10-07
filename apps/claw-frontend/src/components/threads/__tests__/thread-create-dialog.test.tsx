import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ThreadGenerationFormOptions } from '@/types/thread-publication.types';

import { ThreadCreateDialog } from '../thread-create-dialog';

const push = vi.fn();
let capturedOptions: ThreadGenerationFormOptions | null = null;

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/hooks/threads/use-thread-generation-form', () => ({
  useThreadGenerationForm: (options: ThreadGenerationFormOptions) => {
    capturedOptions = options;
    return {};
  },
}));
vi.mock('../thread-generation-form', () => ({
  ThreadGenerationForm: () => <div data-testid="thread-generation-form" />,
}));

describe('ThreadCreateDialog', () => {
  beforeEach(() => {
    push.mockClear();
    capturedOptions = null;
  });

  it('renders nothing of the form while closed', () => {
    render(
      <ThreadCreateDialog open={false} onOpenChange={vi.fn()} threadId="t1" threadTitle="A chat" />,
    );

    expect(screen.queryByTestId('thread-generation-form')).not.toBeInTheDocument();
    expect(capturedOptions).toBeNull();
  });

  it('fixes the source chat and pre-fills the topic from the chat title', () => {
    render(
      <ThreadCreateDialog open onOpenChange={vi.fn()} threadId="t1" threadTitle="Local-first AI" />,
    );

    expect(screen.getByTestId('thread-generation-form')).toBeInTheDocument();
    expect(capturedOptions?.fixedSourceThreadId).toBe('t1');
    expect(capturedOptions?.defaultTopic).toBe('Local-first AI');
  });

  it('closes and opens the new publication in the portal once generation starts', () => {
    const onOpenChange = vi.fn();
    render(<ThreadCreateDialog open onOpenChange={onOpenChange} threadId="t1" threadTitle="x" />);

    capturedOptions?.onStarted('pub 1');

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(push).toHaveBeenCalledWith('/threads?publication=pub%201');
  });
});
