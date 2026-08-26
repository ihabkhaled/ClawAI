import { FeedbackStatus, FeedbackType } from '@claw/shared-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminFeedbackDetailDialog } from '@/components/admin/feedback/admin-feedback-detail-dialog';
import type { FeedbackTicket } from '@/types/feedback.types';

const controller = vi.fn();
const openImagePreview = vi.fn();

vi.mock('@/hooks/admin/feedback/use-admin-feedback-detail-dialog', () => ({
  useAdminFeedbackDetailDialog: () => controller(),
}));
vi.mock('@/hooks/admin/feedback/use-feedback-attachment-url', () => ({
  useFeedbackAttachmentUrl: () => 'blob:attachment',
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/markdown/markdown-renderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <p>{content}</p>,
}));

const ticket: FeedbackTicket = {
  id: 't1',
  ticketNumber: 'FDB-000004',
  userId: 'u1',
  reporterEmail: 'admin@claw-ai.co',
  type: FeedbackType.BUG_REPORT,
  title: 'Two close buttons',
  subject: 'Admin feedback dialog',
  contentMarkdown: 'The attachment viewer shows two X buttons.',
  status: FeedbackStatus.OPEN,
  attachments: [
    {
      fileId: 'f1',
      filename: 'screenshot.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      isScreenshot: true,
    },
  ],
  pageContext: {
    route: '/admin/feedback',
    url: 'https://claw.local/admin/feedback?status=OPEN&page=1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    locale: 'en',
    appVersion: '1.38.2',
    viewportWidth: 1920,
    viewportHeight: 1080,
  },
  history: [
    {
      action: 'STATUS_CHANGED',
      fromStatus: FeedbackStatus.OPEN,
      toStatus: FeedbackStatus.RESOLVED,
      actorId: 'u1',
      actorEmail: 'admin@claw-ai.co',
      note: null,
      at: '2026-08-26T21:00:27.000Z',
    },
  ],
  createdAt: '2026-08-26T20:59:00.000Z',
  updatedAt: '2026-08-26T21:01:21.000Z',
};

function renderDialog(overrides: Record<string, unknown> = {}): void {
  controller.mockReturnValue({
    ticket,
    isLoading: false,
    changeStatus: vi.fn(),
    isChanging: false,
    imagePreview: null,
    openImagePreview,
    closeImagePreview: vi.fn(),
    ...overrides,
  });
  render(<AdminFeedbackDetailDialog ticketId="t1" open onOpenChange={vi.fn()} />);
}

describe('AdminFeedbackDetailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The dialog and its nested image viewer each rendered a close button, so the
  // ticket view offered more than one X with no visible owner.
  it('offers exactly one close control', () => {
    renderDialog();

    expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
  });

  it('labels every metadata field from the dictionary instead of hardcoded English', () => {
    renderDialog();

    expect(screen.getByText('feedback.admin.detail.reporter')).toBeInTheDocument();
    expect(screen.getByText('feedback.admin.detail.created')).toBeInTheDocument();
    expect(screen.getByText('feedback.admin.detail.context')).toBeInTheDocument();
    expect(screen.getByText('feedback.admin.detail.userAgent')).toBeInTheDocument();
    expect(screen.getByText('feedback.admin.detail.history')).toBeInTheDocument();
  });

  // The URL and user agent used to sit in a `truncate` cell, which hid the only
  // part an admin reproduces a bug from.
  it('shows the full url and user agent', () => {
    renderDialog();

    expect(
      screen.getByText('https://claw.local/admin/feedback?status=OPEN&page=1'),
    ).toBeInTheDocument();
    expect(screen.getByText(ticket.pageContext?.userAgent ?? '')).toBeInTheDocument();
  });

  it('opens the attachment viewer with the filename', async () => {
    renderDialog();

    await userEvent.click(screen.getByRole('button', { name: /screenshot\.png/ }));

    expect(openImagePreview).toHaveBeenCalledWith('blob:attachment', 'screenshot.png');
  });

  // Returning null while the query ran meant a click on a table row did nothing
  // visible until the response landed.
  it('stays mounted with a loading state while the ticket loads', () => {
    renderDialog({ ticket: undefined, isLoading: true });

    expect(screen.getByRole('dialog', { name: 'common.loading' })).toBeInTheDocument();
  });
});
