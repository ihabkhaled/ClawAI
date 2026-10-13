import { useCallback } from 'react';

import { useToast } from '@/components/ui/use-toast';
import { ToastVariant } from '@/enums/toast-variant.enum';
import { useTranslation } from '@/lib/i18n';

/** A short success toast from a translation key. Failures are shown inline, not as toasts. */
export function usePluginToast(): (key: string) => void {
  const { t } = useTranslation();
  const { toast } = useToast();
  return useCallback(
    (key: string): void => {
      toast({ title: t(key), variant: ToastVariant.Success });
    },
    [t, toast],
  );
}
