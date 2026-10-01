'use client';

import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { FeedbackSource } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import type { AdminFeedbackSourceBadgeProps } from '@/types/feedback-props.types';
import { feedbackSourceLabelKey } from '@/utilities/feedback-label.utility';

// Visitor tickets get the filled badge and signed-in ones the muted one, so a
// public submission stands out in a list that is mostly member feedback.
export function AdminFeedbackSourceBadge({ source }: AdminFeedbackSourceBadgeProps): ReactElement {
  const { t } = useTranslation();
  return (
    <Badge
      variant={source === FeedbackSource.PUBLIC ? 'default' : 'secondary'}
      data-testid="feedback-source-badge"
      className="whitespace-nowrap"
    >
      {t(feedbackSourceLabelKey(source))}
    </Badge>
  );
}
