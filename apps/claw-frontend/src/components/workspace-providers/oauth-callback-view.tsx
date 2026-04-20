'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

import { OAuthCallbackPhase } from '@/enums/oauth-callback-phase.enum';
import { useOAuthCallbackPage } from '@/hooks/workspace-providers/use-oauth-callback-page';
import { useTranslation } from '@/lib/i18n';

export function OAuthCallbackView(): React.ReactElement {
  const { t } = useTranslation();
  const { phase, errorMessage, connectorName } = useOAuthCallbackPage();

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 p-8 text-center">
      {phase === OAuthCallbackPhase.EXCHANGING ? (
        <>
          <Loader2 className="size-10 animate-spin text-primary" />
          <h1 className="text-xl font-semibold">
            {t('workspaceProviders.oauthCallback.exchangingTitle')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('workspaceProviders.oauthCallback.exchangingDescription')}
          </p>
        </>
      ) : null}

      {phase === OAuthCallbackPhase.SUCCESS ? (
        <>
          <CheckCircle2 className="size-10 text-emerald-500" />
          <h1 className="text-xl font-semibold">
            {t('workspaceProviders.oauthCallback.successTitle')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {connectorName !== undefined
              ? t('workspaceProviders.oauthCallback.successDescriptionNamed', {
                  name: connectorName,
                })
              : t('workspaceProviders.oauthCallback.successDescription')}
          </p>
        </>
      ) : null}

      {phase === OAuthCallbackPhase.ERROR ? (
        <>
          <XCircle className="size-10 text-destructive" />
          <h1 className="text-xl font-semibold">
            {t('workspaceProviders.oauthCallback.errorTitle')}
          </h1>
          <p className="text-sm text-destructive">
            {errorMessage ?? t('workspaceProviders.oauthCallback.errorUnknown')}
          </p>
        </>
      ) : null}
    </div>
  );
}
