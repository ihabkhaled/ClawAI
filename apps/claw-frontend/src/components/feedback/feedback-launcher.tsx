'use client';

import { MessageSquarePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FEEDBACK_LAUNCHER_CLASSES } from '@/constants/feedback.constants';
import { useFeedbackLauncher } from '@/hooks/feedback/use-feedback-launcher';
import { useTranslation } from '@/lib/i18n';
import type { FeedbackLauncherProps } from '@/types/feedback-props.types';

export function FeedbackLauncher({ onOpen }: FeedbackLauncherProps) {
  const { t } = useTranslation();
  const { launcherRef } = useFeedbackLauncher();

  return (
    <Button
      ref={launcherRef}
      type="button"
      className={FEEDBACK_LAUNCHER_CLASSES}
      aria-label={t('feedback.launcher.ariaLabel')}
      title={t('feedback.launcher.tooltip')}
      onClick={onOpen}
    >
      <MessageSquarePlus className="size-5" />
    </Button>
  );
}
