'use client';

import { MessageSquarePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useFeedbackDialogStore } from '@/stores/feedback-dialog.store';
import { useSidebarStore } from '@/stores/sidebar.store';

// Same look as a SidebarNavItem leaf, but it opens the feedback dialog instead
// of navigating. It also closes the mobile drawer so the dialog is not stacked
// over it.
export function SidebarFeedbackItem(): React.ReactElement {
  const { t } = useTranslation();
  const openFeedback = useFeedbackDialogStore((state) => state.openFeedback);
  const closeSidebar = useSidebarStore((state) => state.close);

  const handleClick = (): void => {
    closeSidebar();
    openFeedback();
  };

  return (
    <Button
      type="button"
      variant="unstyled"
      size="unstyled"
      title={t('feedback.launcher.tooltip')}
      onClick={handleClick}
      className="duration-fast ease-expo-out text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-primary/40 flex min-h-12 w-full items-center justify-start gap-3 rounded-lg px-3 py-2 text-start text-sm font-medium transition-all outline-none focus-visible:ring-2 md:min-h-11"
    >
      <MessageSquarePlus className="h-4 w-4 shrink-0" />
      <span>{t('feedback.launcher.ariaLabel')}</span>
    </Button>
  );
}
