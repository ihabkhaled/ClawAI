'use client';

import { Paperclip } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import type { AdminFeedbackListProps } from '@/types/feedback-props.types';
import { formatDateTimeSafe } from '@/utilities/date.utility';

export function AdminFeedbackCards({ items, onSelect }: AdminFeedbackListProps) {
  const { t } = useTranslation();

  const getStatusLabel = (status: string) => {
    return t(`feedback.admin.status.${status}`);
  };

  const getTypeLabel = (type: string) => {
    return t(`feedback.type.${type}`);
  };

  return (
    <div className="space-y-3 md:hidden">
      {items.map((item) => (
        <Card key={item.id}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelect(item.id)}
            className="h-auto w-full p-0 text-left"
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{item.ticketNumber}</CardTitle>
                {item.attachments.length > 0 && (
                  <Paperclip
                    className="h-4 w-4 text-gray-500"
                    aria-label={t('feedback.admin.hasAttachments')}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{item.title}</p>
                <div className="text-muted-foreground flex flex-wrap gap-2 text-sm">
                  <span>{getTypeLabel(item.type)}</span>
                  <span>•</span>
                  <span>{item.reporterEmail}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Badge variant="outline">{getStatusLabel(item.status)}</Badge>
                  <span className="text-muted-foreground text-xs">
                    {t('feedback.admin.updated')}: {formatDateTimeSafe(item.updatedAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Button>
        </Card>
      ))}
    </div>
  );
}
