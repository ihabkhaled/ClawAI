import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AdminFeedbackPage from '@/app/(portal)/admin/feedback/page';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>): string =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
    locale: 'en',
  }),
}));

// The page under test is the pagination row; the table, cards, filters and the
// detail dialog are each covered where they live.
vi.mock('@/components/admin/feedback/admin-feedback-cards', () => ({
  AdminFeedbackCards: () => null,
}));
vi.mock('@/components/admin/feedback/admin-feedback-table', () => ({
  AdminFeedbackTable: () => null,
}));
vi.mock('@/components/admin/feedback/admin-feedback-filters', () => ({
  AdminFeedbackFilters: () => null,
}));
vi.mock('@/components/admin/feedback/admin-feedback-detail-dialog', () => ({
  AdminFeedbackDetailDialog: () => null,
}));

const setPage = vi.fn();
const setPageSize = vi.fn();

vi.mock('@/hooks/admin/feedback/use-admin-feedback-list', () => ({
  useAdminFeedbackList: () => ({
    items: [],
    total: 213,
    totalPages: 11,
    page: 1,
    pageSize: 20,
    setPage,
    setPageSize,
    status: undefined,
    setStatus: vi.fn(),
    type: undefined,
    setType: vi.fn(),
    search: '',
    setSearch: vi.fn(),
    counts: {},
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

describe('AdminFeedbackPage pagination', () => {
  it('renders the shared control rather than its own Previous/Next row', () => {
    render(<AdminFeedbackPage />);
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
    expect(screen.getByTestId('pagination-rows-per-page')).toBeInTheDocument();
    expect(screen.queryByText('feedback.admin.pagination.previous')).not.toBeInTheDocument();
  });

  it('summarises from the response total, not the rows on screen', () => {
    render(<AdminFeedbackPage />);
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('"total":213');
  });

  it('asks the hook for another page', () => {
    render(<AdminFeedbackPage />);
    screen.getByTestId('pagination-next').click();
    expect(setPage).toHaveBeenCalledWith(2);
  });
});
