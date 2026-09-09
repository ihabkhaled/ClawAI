'use client';

import { MessageSquarePlus, Minus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  FEEDBACK_LAUNCHER_CLASSES,
  FEEDBACK_LAUNCHER_COLLAPSE_HANDLE_CLASSES,
  FEEDBACK_LAUNCHER_EDGE_TAB_CLASSES,
} from '@/constants/feedback.constants';
import { useFeedbackLauncher } from '@/hooks/feedback/use-feedback-launcher';
import { useFeedbackLauncherCollapse } from '@/hooks/feedback/use-feedback-launcher-collapse';
import { useTranslation } from '@/lib/i18n';
import type { FeedbackLauncherProps } from '@/types/feedback-props.types';

export function FeedbackLauncher({ onOpen }: FeedbackLauncherProps) {
  const { t } = useTranslation();
  const { launcherRef } = useFeedbackLauncher();
  const { isCollapsed, collapse, expand, onEdgeTabPointerDown } = useFeedbackLauncherCollapse();

  if (isCollapsed) {
    return (
      <Button
        type="button"
        variant="unstyled"
        size="unstyled"
        className={FEEDBACK_LAUNCHER_EDGE_TAB_CLASSES}
        aria-label={t('feedback.launcher.showAriaLabel')}
        title={t('feedback.launcher.showAriaLabel')}
        onClick={expand}
        onPointerDown={onEdgeTabPointerDown}
      />
    );
  }

  return (
    <div className={`${FEEDBACK_LAUNCHER_CLASSES} inline-flex`}>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className={FEEDBACK_LAUNCHER_COLLAPSE_HANDLE_CLASSES}
        aria-label={t('feedback.launcher.hideAriaLabel')}
        title={t('feedback.launcher.hideAriaLabel')}
        onClick={collapse}
      >
        <Minus className="size-3.5" />
      </Button>
      <Button
        ref={launcherRef}
        type="button"
        aria-label={t('feedback.launcher.ariaLabel')}
        title={t('feedback.launcher.tooltip')}
        onClick={onOpen}
      >
        <MessageSquarePlus className="size-5" />
      </Button>
    </div>
  );
}
