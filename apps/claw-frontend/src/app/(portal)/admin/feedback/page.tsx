'use client';

import { useState } from 'react';

import { AdminFeedbackCards } from '@/components/admin/feedback/admin-feedback-cards';
import { AdminFeedbackDetailDialog } from '@/components/admin/feedback/admin-feedback-detail-dialog';
import { AdminFeedbackFilters } from '@/components/admin/feedback/admin-feedback-filters';
import { AdminFeedbackTable } from '@/components/admin/feedback/admin-feedback-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { useAdminFeedbackList } from '@/hooks/admin/feedback/use-admin-feedback-list';
import { useTranslation } from '@/lib/i18n';

export default function AdminFeedbackPage(): React.ReactElement {
  const { t } = useTranslation();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const {
    items,
    total,
    totalPages,
    page,
    pageSize,
    setPage,
    setPageSize,
    status,
    setStatus,
    type,
    setType,
    search,
    setSearch,
    counts,
  } = useAdminFeedbackList();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('feedback.admin.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminFeedbackFilters
            status={status ?? 'all'}
            onStatusChange={(next) => setStatus(next === 'all' ? undefined : next)}
            type={type ?? 'all'}
            onTypeChange={(next) => setType(next === 'all' ? undefined : next)}
            search={search}
            onSearchChange={setSearch}
            counts={counts ?? {}}
            totalCount={total}
          />
        </CardContent>
      </Card>

      <AdminFeedbackCards items={items} onSelect={setSelectedTicketId} />

      <Card>
        <CardContent className="pt-6">
          <AdminFeedbackTable items={items} onSelect={setSelectedTicketId} />
        </CardContent>
      </Card>

      <Pagination
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        t={t}
      />

      {selectedTicketId === null ? null : (
        <AdminFeedbackDetailDialog
          ticketId={selectedTicketId}
          open={selectedTicketId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTicketId(null);
            }
          }}
        />
      )}
    </div>
  );
}
