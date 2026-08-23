'use client';

import { Paperclip } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/lib/i18n';
import type { AdminFeedbackListProps } from '@/types/feedback-props.types';
import { formatDateTimeSafe } from '@/utilities/date.utility';
import { feedbackStatusLabelKey, feedbackTypeLabelKey } from '@/utilities/feedback-label.utility';

export function AdminFeedbackTable({ items, onSelect }: AdminFeedbackListProps) {
  const { t } = useTranslation();

  const getStatusLabel = (status: string) => {
    return t(feedbackStatusLabelKey(status));
  };

  const getTypeLabel = (type: string) => {
    return t(feedbackTypeLabelKey(type));
  };

  return (
    <div className="hidden overflow-x-auto md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('feedback.admin.table.ticket')}</TableHead>
            <TableHead>{t('feedback.admin.table.type')}</TableHead>
            <TableHead>{t('feedback.admin.table.title')}</TableHead>
            <TableHead>{t('feedback.admin.table.reporter')}</TableHead>
            <TableHead>{t('feedback.admin.table.status')}</TableHead>
            <TableHead>{t('feedback.admin.table.created')}</TableHead>
            <TableHead>{t('feedback.admin.table.updated')}</TableHead>
            <TableHead>{t('feedback.admin.table.attachments')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => onSelect(item.id)}
                  className="h-auto p-0 font-medium text-blue-600 hover:underline"
                >
                  {item.ticketNumber}
                </Button>
              </TableCell>
              <TableCell>{getTypeLabel(item.type)}</TableCell>
              <TableCell>{item.title}</TableCell>
              <TableCell>{item.reporterEmail}</TableCell>
              <TableCell>
                <Badge variant="outline">{getStatusLabel(item.status)}</Badge>
              </TableCell>
              <TableCell>{formatDateTimeSafe(item.createdAt)}</TableCell>
              <TableCell>{formatDateTimeSafe(item.updatedAt)}</TableCell>
              <TableCell>
                {item.attachments.length > 0 && (
                  <Paperclip
                    className="h-4 w-4 text-gray-500"
                    aria-label={t('feedback.admin.hasAttachments')}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
