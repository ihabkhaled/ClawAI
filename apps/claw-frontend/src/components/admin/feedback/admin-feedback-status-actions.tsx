'use client';

import { FEEDBACK_STATUS_TRANSITIONS } from '@claw/shared-constants';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { AdminFeedbackStatusActionsProps } from '@/types/feedback-props.types';
import { feedbackStatusLabelKey } from '@/utilities/feedback-label.utility';

export function AdminFeedbackStatusActions({
  status,
  isChanging,
  onChange,
}: AdminFeedbackStatusActionsProps) {
  const { t } = useTranslation();
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  const transitions =
    FEEDBACK_STATUS_TRANSITIONS[status as keyof typeof FEEDBACK_STATUS_TRANSITIONS] || [];

  const handleAction = (newStatus: string) => {
    if (newStatus === 'archived') {
      if (confirmingArchive) {
        onChange(newStatus);
        setConfirmingArchive(false);
      } else {
        setConfirmingArchive(true);
      }
    } else {
      onChange(newStatus);
    }
  };

  const getActionLabel = (newStatus: string) => {
    switch (newStatus) {
      case 'inProgress':
        return t('feedback.admin.actions.markInProgress');
      case 'resolved':
        return t('feedback.admin.actions.resolve');
      case 'closed':
        return t('feedback.admin.actions.close');
      case 'open':
        return t('feedback.admin.actions.reopen');
      case 'archived':
        return confirmingArchive
          ? t('feedback.admin.actions.confirmArchive')
          : t('feedback.admin.actions.archive');
      default:
        return t(feedbackStatusLabelKey(newStatus));
    }
  };

  if (transitions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((newStatus) => (
        <Button
          key={newStatus}
          type="button"
          variant={newStatus === 'archived' && confirmingArchive ? 'destructive' : 'outline'}
          size="sm"
          disabled={isChanging}
          onClick={() => handleAction(newStatus)}
        >
          {getActionLabel(newStatus)}
        </Button>
      ))}
    </div>
  );
}
