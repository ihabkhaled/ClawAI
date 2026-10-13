'use client';

import type { ReactElement } from 'react';

import { Pagination } from '@/components/ui/pagination';
import { useTranslation } from '@/lib/i18n';
import type { BoardPaginationProps } from '@/types/thread-board-view.types';

export function BoardPagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
}: BoardPaginationProps): ReactElement | null {
  const { t } = useTranslation();
  if (totalPages <= 1) {
    return null;
  }
  return (
    <Pagination
      page={page}
      pageSize={limit}
      totalPages={totalPages}
      totalItems={total}
      onPageChange={onPageChange}
      onPageSizeChange={() => undefined}
      hidePageSize
      t={t}
    />
  );
}
