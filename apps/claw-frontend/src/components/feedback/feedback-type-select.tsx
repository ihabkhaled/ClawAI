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
import type { FeedbackTypeSelectProps } from '@/types/feedback-props.types';

export function FeedbackTypeSelect({ value, onChange, error }: FeedbackTypeSelectProps) {
  const { t } = useTranslation();
  const errorId = error ? 'feedback-type-error' : undefined;

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={error ? 'border-red-500' : ''}
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
      {error && (
        <p id={errorId} className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
