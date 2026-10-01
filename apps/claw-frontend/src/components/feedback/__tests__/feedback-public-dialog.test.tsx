import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedbackDialog } from '@/components/feedback/feedback-dialog';
import { AUTH_INITIAL_STATE } from '@/constants';
import { ApiClientError } from '@/services/shared/api-client';
import { useAuthStore } from '@/stores/auth.store';

const createPublic = vi.fn();
const createGuarded = vi.fn();
const toast = vi.fn();

vi.mock('@/repositories/feedback/feedback-public.repository', () => ({
  feedbackPublicRepository: { create: (payload: unknown) => createPublic(payload) },
}));
vi.mock('@/repositories/feedback/feedback.repository', () => ({
  feedbackRepository: { create: (payload: unknown) => createGuarded(payload) },
}));
vi.mock('@/hooks/feedback/use-page-context', () => ({
  usePageContext: () => () => ({ url: 'https://claw.local/en', locale: 'en' }),
}));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en' }),
}));
vi.mock('@/lib/markdown/markdown-renderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <p>{content}</p>,
}));
vi.mock('@/hooks/feedback/use-feedback-attachments', () => ({
  useFeedbackAttachments: () => ({
    attachments: [],
    progress: {},
    uploadError: null,
    isUploading: false,
    addFiles: vi.fn(),
    addDataUrl: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  }),
}));
vi.mock('@/hooks/feedback/use-screenshot-capture', () => ({
  useScreenshotCapture: () => ({
    screenshot: null,
    isCapturing: false,
    isSupported: true,
    error: null,
    capture: vi.fn(),
    clear: vi.fn(),
  }),
}));

function renderDialog(onOpenChange = vi.fn()): ReturnType<typeof vi.fn> {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <FeedbackDialog open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return onOpenChange;
}

async function fillValid(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText('feedback.dialog.nameLabel'), 'Ada Lovelace');
  await user.type(screen.getByLabelText('feedback.dialog.emailLabel'), 'ada@example.com');
  const message = document.querySelector('textarea');
  if (message === null) {
    throw new Error('message textarea missing');
  }
  await user.type(message, 'Great');
}

describe('FeedbackDialog, signed out (public mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState(AUTH_INITIAL_STATE);
  });

  it('asks for name and email and offers no screenshot or attachment controls', () => {
    renderDialog();

    expect(screen.getByLabelText('feedback.dialog.nameLabel')).toHaveAttribute(
      'autocomplete',
      'name',
    );
    expect(screen.getByLabelText('feedback.dialog.emailLabel')).toHaveAttribute('type', 'email');
    expect(screen.queryByText('feedback.captureScreenshot')).toBeNull();
    expect(screen.queryByText('feedback.uploadAttachments')).toBeNull();
    expect(screen.queryByLabelText('feedback.dialog.subjectLabel')).toBeNull();
  });

  it('carries a hidden, untabbable, non-autofilled honeypot named website', () => {
    renderDialog();

    const honeypot = document.querySelector<HTMLInputElement>('input[name="website"]');
    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute('aria-hidden', 'true');
    expect(honeypot).toHaveAttribute('tabindex', '-1');
    expect(honeypot).toHaveAttribute('autocomplete', 'off');
    expect(honeypot?.value).toBe('');
  });

  it('shows translated validation errors and sends nothing when fields are empty', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'feedback.dialog.submit' }));

    expect(await screen.findByText('feedback.errors.nameRequired')).toBeInTheDocument();
    expect(screen.getByText('feedback.errors.emailInvalid')).toBeInTheDocument();
    expect(screen.getByText('feedback.errors.contentRequired')).toBeInTheDocument();
    expect(createPublic).not.toHaveBeenCalled();
  });

  it('rejects a malformed email', async () => {
    const user = userEvent.setup();
    renderDialog();
    await fillValid(user);
    const email = screen.getByLabelText('feedback.dialog.emailLabel');
    await user.clear(email);
    await user.type(email, 'not-an-email');

    await user.click(screen.getByRole('button', { name: 'feedback.dialog.submit' }));

    expect(await screen.findByText('feedback.errors.emailInvalid')).toBeInTheDocument();
    expect(createPublic).not.toHaveBeenCalled();
  });

  it('submits the public payload, shows success and closes', async () => {
    const user = userEvent.setup();
    createPublic.mockResolvedValue({ id: 'f1' });
    const onOpenChange = renderDialog();
    await fillValid(user);

    await user.click(screen.getByRole('button', { name: 'feedback.dialog.submit' }));

    await waitFor(() => expect(createPublic).toHaveBeenCalledTimes(1));
    expect(createPublic).toHaveBeenCalledWith({
      type: 'GENERAL_FEEDBACK',
      message: 'Great',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      pageUrl: 'https://claw.local/en',
      locale: 'en',
      website: '',
    });
    expect(createGuarded).not.toHaveBeenCalled();
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: 'feedback.submittedPublic' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('says "too many, try later" on a 429', async () => {
    const user = userEvent.setup();
    createPublic.mockRejectedValue(new ApiClientError({ message: 'x', status: 429 }));
    renderDialog();
    await fillValid(user);

    await user.click(screen.getByRole('button', { name: 'feedback.dialog.submit' }));

    expect(await screen.findByText('feedback.errors.rateLimited')).toBeInTheDocument();
  });

  it('says "check your details" on a 400 and a generic failure otherwise', async () => {
    const user = userEvent.setup();
    createPublic.mockRejectedValueOnce(new ApiClientError({ message: 'x', status: 400 }));
    renderDialog();
    await fillValid(user);

    await user.click(screen.getByRole('button', { name: 'feedback.dialog.submit' }));
    expect(await screen.findByText('feedback.errors.checkFields')).toBeInTheDocument();

    createPublic.mockRejectedValueOnce(new ApiClientError({ message: 'x', status: 500 }));
    await user.click(screen.getByRole('button', { name: 'feedback.dialog.submit' }));
    expect(await screen.findByText('feedback.errors.submitFailed')).toBeInTheDocument();
  });

  it('never writes the typed email to local storage', async () => {
    const user = userEvent.setup();
    createPublic.mockResolvedValue({ id: 'f1' });
    renderDialog();
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'feedback.dialog.submit' }));
    await waitFor(() => expect(createPublic).toHaveBeenCalled());

    expect(JSON.stringify({ ...window.localStorage })).not.toContain('ada@example.com');
  });
});

describe('FeedbackDialog, signed in (member mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true, accessToken: 't', refreshToken: 'r' });
  });

  it('asks for no name or email, keeps the file controls, and has no honeypot', () => {
    renderDialog();

    expect(screen.queryByLabelText('feedback.dialog.nameLabel')).toBeNull();
    expect(screen.queryByLabelText('feedback.dialog.emailLabel')).toBeNull();
    expect(screen.getByLabelText('feedback.dialog.subjectLabel')).toBeInTheDocument();
    expect(document.querySelector('input[name="website"]')).toBeNull();
  });
});
