import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { WORKSPACE_OAUTH_CALLBACK_PATH } from '@/constants/workspace-providers.constants';
import { OAuthCallbackPhase } from '@/enums/oauth-callback-phase.enum';
import { workspaceProviderRegistryRepository } from '@/repositories/workspace/provider-registry.repository';
import type { UseOAuthCallbackPageReturn } from '@/types/workspace-providers.types';

export function useOAuthCallbackPage(): UseOAuthCallbackPageReturn {
  const params = useSearchParams();
  const router = useRouter();
  const [phase, setPhase] = useState<OAuthCallbackPhase>(OAuthCallbackPhase.EXCHANGING);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [connectorName, setConnectorName] = useState<string | undefined>(undefined);
  const didExchangeRef = useRef(false);

  useEffect(() => {
    if (didExchangeRef.current) {
      return;
    }
    didExchangeRef.current = true;

    const code = params.get('code');
    const state = params.get('state');
    const errorFromProvider = params.get('error');

    if (errorFromProvider !== null) {
      setPhase(OAuthCallbackPhase.ERROR);
      setErrorMessage(params.get('error_description') ?? errorFromProvider);
      return;
    }

    if (code === null || state === null) {
      setPhase(OAuthCallbackPhase.ERROR);
      setErrorMessage('Missing code or state in callback URL');
      return;
    }

    const redirectUri = `${window.location.origin}${WORKSPACE_OAUTH_CALLBACK_PATH}`;
    workspaceProviderRegistryRepository
      .completeOAuth({ code, state, redirectUri })
      .then((connector) => {
        setConnectorName(connector.name);
        setPhase(OAuthCallbackPhase.SUCCESS);
        setTimeout(() => router.push('/workspace'), 2000);
      })
      .catch((error: unknown) => {
        setPhase(OAuthCallbackPhase.ERROR);
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      });
  }, [params, router]);

  return { phase, errorMessage, connectorName };
}
