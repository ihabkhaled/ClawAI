import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

import { GRAFANA_PATH } from '@/constants/grafana.constants';
import { usePermissions } from '@/hooks/auth/use-permissions';
import { useTranslation } from '@/lib/i18n';
import { grantGrafanaAccess } from '@/repositories/auth/grafana-access.repository';
import type { GrafanaTabOpener, UseOpenGrafanaResult } from '@/types/grafana-access.types';
import { showToast } from '@/utilities';
import { openDetachedTab } from '@/utilities/detached-tab.utility';

/**
 * "Open Grafana" (ADR-115): mint the admin cookie, then show /grafana/ in a
 * new tab. There is no second login — the cookie comes from this session.
 *
 * Only an ADMIN sees the control; auth-service refuses everyone else anyway.
 */
export function useOpenGrafana(openTab: GrafanaTabOpener = openDetachedTab): UseOpenGrafanaResult {
  const { t } = useTranslation();
  const { isAdmin } = usePermissions();
  const mutation = useMutation({ mutationFn: grantGrafanaAccess });
  const { mutate } = mutation;

  const openGrafana = useCallback((): void => {
    // Before the request, while this is still the user's click.
    const tab = openTab();
    mutate(undefined, {
      onSuccess: () => {
        if (tab === null) {
          window.location.assign(GRAFANA_PATH);
          return;
        }
        tab.location.href = GRAFANA_PATH;
      },
      onError: (error: Error) => {
        tab?.close();
        showToast.apiError(error, t('observability.grafana.failed'), { translate: t });
      },
    });
  }, [mutate, openTab, t]);

  return { canOpenGrafana: isAdmin, isOpening: mutation.isPending, openGrafana };
}
