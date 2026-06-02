import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { CardGridSkeleton } from '@/components/common/skeletons/card-grid-skeleton';
import { DashboardSkeleton } from '@/components/common/skeletons/dashboard-skeleton';
import { FormSkeleton } from '@/components/common/skeletons/form-skeleton';
import { ThreadListSkeleton } from '@/components/common/skeletons/thread-list-skeleton';
import { ThreadMessagesSkeleton } from '@/components/common/skeletons/thread-messages-skeleton';

describe('page-level skeletons', () => {
  it('DashboardSkeleton renders a busy status region', () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.querySelector('[role="status"]')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(4);
  });

  it('ThreadListSkeleton honours the rows prop', () => {
    const { container } = render(<ThreadListSkeleton rows={5} />);
    // Each ListRowSkeleton renders multiple pulse blocks; assert at least 5 rows.
    expect(container.querySelectorAll('.rounded-lg.border').length).toBe(5);
  });

  it('ThreadMessagesSkeleton alternates bubble sides', () => {
    const { container } = render(<ThreadMessagesSkeleton bubbles={4} />);
    expect(container.querySelectorAll('.justify-end').length).toBe(2);
    expect(container.querySelectorAll('.justify-start').length).toBe(2);
  });

  it('CardGridSkeleton renders the requested card count', () => {
    const { container } = render(<CardGridSkeleton count={3} />);
    expect(container.querySelectorAll('.shadow-soft').length).toBe(3);
  });

  it('FormSkeleton renders field rows plus a submit placeholder', () => {
    const { container } = render(<FormSkeleton fields={3} />);
    expect(container.querySelectorAll('.space-y-2').length).toBe(3);
  });

  it('clamps non-positive counts to at least one', () => {
    const { container } = render(<CardGridSkeleton count={0} />);
    expect(container.querySelectorAll('.shadow-soft').length).toBeGreaterThan(0);
  });
});
