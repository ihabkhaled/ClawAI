import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from '@/components/ui/pagination';

// The control a person uses to reach page 30 without pressing Next 29 times.
// Every assertion here is about that: the numbers are reachable, the jump box
// cannot produce a page that does not exist, and the ends do not run off.
const t = (key: string, params?: Record<string, string | number>): string =>
  params === undefined ? key : `${key}:${JSON.stringify(params)}`;

function renderPagination(overrides: Partial<React.ComponentProps<typeof Pagination>> = {}) {
  const onPageChange = vi.fn();
  const onPageSizeChange = vi.fn();
  render(
    <Pagination
      page={7}
      pageSize={20}
      totalPages={40}
      totalItems={800}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      t={t}
      {...overrides}
    />,
  );
  return { onPageChange, onPageSizeChange };
}

describe('Pagination', () => {
  it('offers the first page, the last page and the current neighbourhood', () => {
    renderPagination();
    for (const page of [1, 6, 7, 8, 40]) {
      expect(screen.getByTestId(`pagination-page-${String(page)}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('pagination-page-20')).not.toBeInTheDocument();
  });

  it('jumps straight to a numbered page', () => {
    const { onPageChange } = renderPagination();
    fireEvent.click(screen.getByTestId('pagination-page-40'));
    expect(onPageChange).toHaveBeenCalledWith(40);
  });

  it('marks the current page for a screen reader', () => {
    renderPagination();
    expect(screen.getByTestId('pagination-page-7')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('pagination-page-8')).not.toHaveAttribute('aria-current');
  });

  it('clamps a typed page to one that exists', () => {
    const { onPageChange } = renderPagination();
    fireEvent.change(screen.getByTestId('pagination-jump'), { target: { value: '999' } });
    expect(onPageChange).toHaveBeenCalledWith(40);
  });

  it('disables Previous on the first page and Next on the last', () => {
    const { onPageChange } = renderPagination({ page: 1 });
    expect(screen.getByTestId('pagination-previous')).toBeDisabled();
    expect(screen.getByTestId('pagination-next')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('pagination-next'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables both ends when there is a single page', () => {
    renderPagination({ page: 1, totalPages: 1, totalItems: 3 });
    expect(screen.getByTestId('pagination-previous')).toBeDisabled();
    expect(screen.getByTestId('pagination-next')).toBeDisabled();
  });

  it('says which rows are on screen, not just which page', () => {
    renderPagination({ page: 3, pageSize: 20, totalItems: 213, totalPages: 11 });
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('"from":41');
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('"to":60');
  });

  it('shows an empty message rather than "1-0 of 0"', () => {
    renderPagination({ totalItems: 0, totalPages: 1, page: 1 });
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('pagination.empty');
  });

  it('offers a rows-per-page control, and can hide it where the size is fixed', () => {
    const { unmount } = render(
      <Pagination
        page={1}
        pageSize={20}
        totalPages={2}
        totalItems={30}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId('pagination-rows-per-page')).toBeInTheDocument();
    unmount();

    renderPagination({ hidePageSize: true });
    expect(screen.queryByTestId('pagination-rows-per-page')).not.toBeInTheDocument();
  });

  it('is a labelled landmark, so it is findable without sight', () => {
    renderPagination();
    expect(screen.getByRole('navigation', { name: 'pagination.label' })).toBeInTheDocument();
  });
});
