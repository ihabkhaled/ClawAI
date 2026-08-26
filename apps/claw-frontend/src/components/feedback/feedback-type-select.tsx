'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FEEDBACK_TYPE_OPTIONS } from '@/constants/feedback.constants';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { FeedbackTypeSelectProps } from '@/types/feedback-props.types';

export function FeedbackTypeSelect({ value, onChange, error }: FeedbackTypeSelectProps) {
  const { t } = useTranslation();
  const errorId = error === undefined ? undefined : 'feedback-type-error';

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" id="feedback-type-label" htmlFor="feedback-type">
        {t('feedback.dialog.typeLabel')}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id="feedback-type"
          aria-labelledby="feedback-type-label feedback-type"
          aria-invalid={error !== undefined}
          aria-describedby={errorId}
          className={cn('w-full', error !== undefined && 'border-destructive')}
        >
          <SelectValue placeholder={t('feedback.type.placeholder')} />
        </SelectTrigger>
        <SelectContent>
          {FEEDBACK_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error === undefined ? null : (
        <p id={errorId} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
