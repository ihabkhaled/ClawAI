'use client';

import { MessageSquarePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useFeedbackDialogStore } from '@/stores/feedback-dialog.store';

export function TopbarFeedbackButton(): React.ReactElement {
  const { t } = useTranslation();
  const openFeedback = useFeedbackDialogStore((state) => state.openFeedback);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="focus-visible:ring-primary/40 shrink-0 focus-visible:ring-2"
      aria-label={t('feedback.launcher.ariaLabel')}
      title={t('feedback.launcher.tooltip')}
      onClick={openFeedback}
    >
      <MessageSquarePlus className="h-5 w-5" />
    </Button>
  );
}
