import { Flag, X } from 'lucide-react';
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
import {
  THREAD_REPORT_REASONS,
  THREAD_REPORT_REASON_LABEL_KEYS,
} from '@/constants/thread-publication.constants';
import { useTranslation } from '@/lib/i18n';
import type { ThreadPublicReportFormProps } from '@/types/thread-publication.types';
import { parseThreadReportReason } from '@/utilities/thread-report-reason.utility';

export function ThreadPublicReportForm({
  commentId,
  actions,
}: ThreadPublicReportFormProps): ReactElement {
  const { t } = useTranslation();
  const target = commentId || 'publication';

  return (
    <form
      className="border-border bg-muted/40 flex flex-col gap-3 rounded-lg border p-4"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        actions.submitReport();
      }}
    >
      <label
        htmlFor={`thread-report-reason-${target}`}
        className="flex items-center gap-2 text-sm font-medium"
      >
        <Flag className="h-4 w-4" aria-hidden="true" />
        {t('chat.threadPublicReportReason')}
      </label>
      <Select
        value={actions.reportReason}
        onValueChange={(value) => {
          const reason = parseThreadReportReason(value);
          if (reason !== null) {
            actions.setReportReason(reason);
          }
        }}
      >
        <SelectTrigger id={`thread-report-reason-${target}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {THREAD_REPORT_REASONS.map((reason) => (
            <SelectItem key={reason} value={reason}>
              {t(THREAD_REPORT_REASON_LABEL_KEYS[reason])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label htmlFor={`thread-report-details-${target}`} className="text-sm font-medium">
        {t('chat.threadPublicReportDetails')}
      </label>
      <Textarea
        id={`thread-report-details-${target}`}
        maxLength={1000}
        value={actions.reportDetails}
        onChange={(event) => actions.setReportDetails(event.target.value)}
        disabled={actions.isSubmitting}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="submit"
          disabled={actions.isSubmitting}
          isLoading={actions.isSubmitting}
          className="w-full sm:w-auto"
        >
          <Flag className="h-4 w-4" aria-hidden="true" />
          {t('chat.threadPublicSubmitReport')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => actions.setReportTarget(null)}
          disabled={actions.isSubmitting}
          className="w-full sm:w-auto"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
