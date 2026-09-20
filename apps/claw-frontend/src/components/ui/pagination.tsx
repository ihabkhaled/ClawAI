'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAGE_SIZE_OPTIONS } from '@/constants/pagination.constants';
import { PageWindowGap } from '@/enums/page-window-gap.enum';
import type { PaginationProps } from '@/types/pagination.types';
import { buildPageWindow, clampPage, pageRange } from '@/utilities/pagination.utility';

export function Pagination({
  page,
  pageSize,
  totalPages,
  totalItems,
  onPageChange,
  onPageSizeChange,
  t,
  hidePageSize = false,
  label,
}: PaginationProps): ReactElement {
  const current = clampPage(page, totalPages);
  const range = pageRange(current, pageSize, totalItems);

  return (
    <nav
      aria-label={label ?? t('pagination.label')}
      data-testid="pagination"
      className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="text-muted-foreground flex items-center gap-3 text-sm">
        {range === null ? (
          <span data-testid="pagination-summary">{t('pagination.empty')}</span>
        ) : (
          <span data-testid="pagination-summary">
            {t('pagination.showing', {
              from: range.from,
              to: range.to,
              total: totalItems,
            })}
          </span>
        )}
        {hidePageSize ? null : (
          <span className="flex items-center gap-2">
            <label className="whitespace-nowrap" htmlFor="pagination-page-size">
              {t('pagination.rowsPerPage')}
            </label>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger
                id="pagination-page-size"
                aria-label={t('pagination.rowsPerPage')}
                data-testid="pagination-rows-per-page"
                className="w-20"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          aria-label={t('pagination.previous')}
          data-testid="pagination-previous"
          onClick={() => onPageChange(current - 1)}
          disabled={current <= 1}
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </Button>

        {buildPageWindow(current, totalPages).map((item, index) =>
          item === PageWindowGap.ELLIPSIS ? (
            <span
              // Two gaps can appear in one strip and neither is a page, so the
              // position is the only stable key available.
              key={`gap-${String(index)}`}
              aria-hidden="true"
              className="text-muted-foreground px-1 text-sm"
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={item === current ? 'default' : 'outline'}
              size="sm"
              aria-label={t('pagination.goToPage', { page: item })}
              aria-current={item === current ? 'page' : undefined}
              data-testid={`pagination-page-${String(item)}`}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="sm"
          aria-label={t('pagination.next')}
          data-testid="pagination-next"
          onClick={() => onPageChange(current + 1)}
          disabled={current >= totalPages}
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </Button>

        <Input
          type="number"
          min={1}
          max={totalPages}
          value={current}
          aria-label={t('pagination.jumpTo')}
          data-testid="pagination-jump"
          className="ms-2 w-16"
          onChange={(event) => onPageChange(clampPage(Number(event.target.value), totalPages))}
        />
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          {t('pagination.ofPages', { total: totalPages })}
        </span>
      </div>
    </nav>
  );
}
