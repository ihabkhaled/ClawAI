import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { FeedbackDialog } from '@/components/feedback/feedback-dialog';

const submit = vi.fn();

vi.mock('@/hooks/feedback/use-feedback-form', () => ({
  useFeedbackForm: () => ({
    form: useForm({ defaultValues: { type: '', title: '', subject: '', contentMarkdown: '' } }),
    submit,
    isSubmitting: false,
    submitError: null,
  }),
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
    error: null,
    capture: vi.fn(),
    clear: vi.fn(),
  }),
}));
vi.mock('@/hooks/feedback/use-page-context', () => ({ usePageContext: () => () => ({}) }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/markdown/markdown-renderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <p>{content}</p>,
}));

describe('FeedbackDialog', () => {
  // Radix already renders the dialog close; nothing inside the form may add a
  // second one, which is what made the feedback surfaces show two X glyphs.
  it('offers exactly one close control', () => {
    render(<FeedbackDialog open onOpenChange={vi.fn()} />);

    expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
  });

  // The feedback type dropdown shipped with no label at all, so the first
  // control in the dialog was an unnamed combobox.
  it('labels the feedback type control', () => {
    render(<FeedbackDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByText('feedback.dialog.typeLabel')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAccessibleName(/feedback\.dialog\.typeLabel/);
  });

  it('keeps the actions out of the scrolling field area', () => {
    render(<FeedbackDialog open onOpenChange={vi.fn()} />);

    const submitButton = screen.getByRole('button', { name: 'feedback.dialog.submit' });
    const scrollArea = document.querySelector('.overflow-y-auto');

    expect(scrollArea).not.toBeNull();
    expect(scrollArea?.contains(submitButton)).toBe(false);
  });
});
