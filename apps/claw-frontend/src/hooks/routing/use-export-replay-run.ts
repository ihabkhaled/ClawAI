import { useMutation } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { routingRepository } from '@/repositories/routing/routing.repository';
import { logger, showToast } from '@/utilities';

export function useExportReplayRun() {
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (runId: string) => routingRepository.exportReplayRun(runId),
    onSuccess: (bundle) => {
      const json = JSON.stringify(bundle, null, 2);
      void navigator.clipboard.writeText(json);
      logger.info({ component: 'replay', action: 'export', message: 'Bundle copied' });
      showToast.success({ title: t('replay.bundleCopied') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'replay', action: 'export-error', message: error.message });
      showToast.apiError(error, t('replay.exportFailed'));
    },
  });

  return {
    exportRun: mutation.mutate,
    isPending: mutation.isPending,
    bundle: mutation.data,
  };
}
