'use client';

import { MessageSquarePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FEEDBACK_LAUNCHER_CLASSES } from '@/constants/feedback.constants';
import { useTranslation } from '@/lib/i18n';
import type { FeedbackLauncherProps } from '@/types/feedback-props.types';

export function FeedbackLauncher({ onOpen }: FeedbackLauncherProps) {
  const { t } = useTranslation();

  return (
    <Button
      type="button"
      className={FEEDBACK_LAUNCHER_CLASSES}
      // Joins the floating registry, so the toast column measures around it
      // instead of stacking on top of it.
      data-floating-obstacle=""
      aria-label={t('feedback.launcher.ariaLabel')}
      title={t('feedback.launcher.tooltip')}
      onClick={onOpen}
    >
      <MessageSquarePlus className="size-5" />
    </Button>
  );
}
