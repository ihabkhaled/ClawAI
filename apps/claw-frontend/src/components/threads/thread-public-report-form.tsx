import type { FormEvent, ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { THREAD_REPORT_REASONS } from '@/constants/thread-publication.constants';
import { useTranslation } from '@/lib/i18n';
import type { ThreadPublicReportFormProps } from '@/types/thread-publication.types';

export function ThreadPublicReportForm({
  commentId,
  actions,
}: ThreadPublicReportFormProps): ReactElement {
  const { t } = useTranslation();
  const target = commentId || 'publication';

  return (
    <form
      className="border-border bg-muted/40 flex flex-col gap-3 rounded-md border p-4"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        actions.submitReport();
      }}
    >
      <label htmlFor={`thread-report-reason-${target}`}>{t('threadPublicReportReason')}</label>
      <Select
        value={actions.reportReason}
        onValueChange={(value) => actions.setReportReason(value as typeof actions.reportReason)}
      >
        <SelectTrigger id={`thread-report-reason-${target}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {THREAD_REPORT_REASONS.map((reason) => (
            <SelectItem key={reason} value={reason}>
              {t(`threadPublicReport${reason}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label htmlFor={`thread-report-details-${target}`}>{t('threadPublicReportDetails')}</label>
      <Textarea
        id={`thread-report-details-${target}`}
        maxLength={1000}
        value={actions.reportDetails}
        onChange={(event) => actions.setReportDetails(event.target.value)}
        disabled={actions.isSubmitting}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={actions.isSubmitting} isLoading={actions.isSubmitting}>
          {t('threadPublicSubmitReport')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => actions.setReportTarget(null)}
          disabled={actions.isSubmitting}
        >
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
