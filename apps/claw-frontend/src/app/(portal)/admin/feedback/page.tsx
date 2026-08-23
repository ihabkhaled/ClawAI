'use client';

import { useState } from 'react';

import { AdminFeedbackCards } from '@/components/admin/feedback/admin-feedback-cards';
import { AdminFeedbackDetailDialog } from '@/components/admin/feedback/admin-feedback-detail-dialog';
import { AdminFeedbackFilters } from '@/components/admin/feedback/admin-feedback-filters';
import { AdminFeedbackTable } from '@/components/admin/feedback/admin-feedback-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminFeedbackList } from '@/hooks/admin/feedback/use-admin-feedback-list';
import { useTranslation } from '@/lib/i18n';

export default function AdminFeedbackPage(): React.ReactElement {
  const { t } = useTranslation();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const {
    items,
    total,
    page,
    limit,
    setPage,
    status,
    setStatus,
    type,
    setType,
    search,
    setSearch,
    counts,
  } = useAdminFeedbackList();

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('feedback.admin.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminFeedbackFilters
            status={status ?? 'all'}
            onStatusChange={setStatus}
            type={type ?? 'all'}
            onTypeChange={setType}
            search={search}
            onSearchChange={setSearch}
            counts={counts ?? {}}
          />
        </CardContent>
      </Card>

      <AdminFeedbackCards items={items} onSelect={setSelectedTicketId} />

      <Card>
        <CardContent className="pt-6">
          <AdminFeedbackTable items={items} onSelect={setSelectedTicketId} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          {t('feedback.admin.pagination.previous')}
        </Button>
        <span className="text-muted-foreground text-sm">
          {t('feedback.admin.pagination.pageOf')
            .replace('{page}', String(page))
            .replace('{total}', String(totalPages))}
        </span>
        <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
          {t('feedback.admin.pagination.next')}
        </Button>
      </div>

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
