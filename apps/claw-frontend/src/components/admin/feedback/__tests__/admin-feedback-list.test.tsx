import { FeedbackStatus, FeedbackType } from '@claw/shared-types';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AdminFeedbackCards } from '@/components/admin/feedback/admin-feedback-cards';
import { AdminFeedbackFilters } from '@/components/admin/feedback/admin-feedback-filters';
import { AdminFeedbackTable } from '@/components/admin/feedback/admin-feedback-table';
import { FeedbackSource } from '@/enums';
import type { FeedbackTicket } from '@/types/feedback.types';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

function makeTicket(overrides: Partial<FeedbackTicket>): FeedbackTicket {
  return {
    id: 't1',
    ticketNumber: 'FDB-000001',
    userId: 'u1',
    reporterEmail: 'qa-visitor@example.com',
    reporterName: 'QA Visitor',
    source: FeedbackSource.PUBLIC,
    type: FeedbackType.GENERAL_FEEDBACK,
    title: 'Hello',
    contentMarkdown: 'body',
    status: FeedbackStatus.OPEN,
    attachments: [],
    history: [],
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  };
}

const visitor = makeTicket({});
const member = makeTicket({
  id: 't2',
  ticketNumber: 'FDB-000002',
  reporterEmail: 'member@example.com',
  reporterName: 'Member One',
  source: FeedbackSource.AUTHENTICATED,
});
// Rows written before the name snapshot and the source column existed.
const legacy = makeTicket({
  id: 't3',
  ticketNumber: 'FDB-000003',
  reporterEmail: 'old@example.com',
  reporterName: null,
  source: undefined,
});

describe.each([
  ['table', AdminFeedbackTable],
  ['cards', AdminFeedbackCards],
])('Admin feedback %s', (_label, List) => {
  it('shows reporter name, email and a translated source badge per row', () => {
    render(<List items={[visitor, member]} onSelect={vi.fn()} />);

    expect(screen.getAllByTestId('feedback-reporter-name').map((n) => n.textContent)).toEqual([
      'QA Visitor',
      'Member One',
    ]);
    expect(screen.getByText('qa-visitor@example.com')).toBeInTheDocument();
    expect(screen.getAllByTestId('feedback-source-badge').map((n) => n.textContent)).toEqual([
      'feedback.admin.source.public',
      'feedback.admin.source.authenticated',
    ]);
  });

  it('omits the name line for a row with no name and treats a missing source as signed in', () => {
    render(<List items={[legacy]} onSelect={vi.fn()} />);

    expect(screen.queryByTestId('feedback-reporter-name')).not.toBeInTheDocument();
    expect(screen.getByText('old@example.com')).toBeInTheDocument();
    expect(screen.getByTestId('feedback-source-badge')).toHaveTextContent(
      'feedback.admin.source.authenticated',
    );
  });

  it('renders a message-borne script tag nowhere and email as plain text', () => {
    const hostile = makeTicket({ reporterEmail: '<img src=x onerror=alert(1)>@x.io' });
    const { container } = render(<List items={[hostile]} onSelect={vi.fn()} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
  });
});

describe('AdminFeedbackTable header', () => {
  it('has a Source column', () => {
    render(<AdminFeedbackTable items={[visitor]} onSelect={vi.fn()} />);
    expect(screen.getByText('feedback.admin.table.source')).toBeInTheDocument();
  });
});

describe('AdminFeedbackFilters source filter', () => {
  const base = {
    status: 'all',
    onStatusChange: vi.fn(),
    type: 'all',
    onTypeChange: vi.fn(),
    source: 'all',
    onSourceChange: vi.fn(),
    search: '',
    onSearchChange: vi.fn(),
    counts: {},
    totalCount: 0,
  };

  it('offers all sources, signed in and visitor, and reports the chosen value', async () => {
    const onSourceChange = vi.fn();
    render(<AdminFeedbackFilters {...base} onSourceChange={onSourceChange} />);

    await userEvent.click(screen.getByTestId('feedback-source-filter'));
    const listbox = await screen.findByRole('listbox');
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual([
      'feedback.admin.source.all',
      'feedback.admin.source.authenticated',
      'feedback.admin.source.public',
    ]);

    await userEvent.click(within(listbox).getByText('feedback.admin.source.public'));
    expect(onSourceChange).toHaveBeenCalledWith(FeedbackSource.PUBLIC);
  });
});
