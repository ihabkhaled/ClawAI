'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Code2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import {
  approveVscodeAuthorization,
  deliverVscodeAuthorization,
  getVscodeAuthorizationDetails,
} from '@/repositories/auth/vscode-authorization.repository';

export default function VscodeAuthorizationPage(): React.ReactElement {
  const { t } = useTranslation();
  const requestId = useSearchParams().get('requestId');
  const [completed, setCompleted] = useState(false);
  const details = useQuery({
    queryKey: ['vscode-authorization', requestId],
    queryFn: () => getVscodeAuthorizationDetails(requestId ?? ''),
    enabled: requestId !== null,
    retry: false,
  });
  const approval = useMutation({
    mutationFn: async () => {
      const result = await approveVscodeAuthorization(requestId ?? '');
      await deliverVscodeAuthorization(result.redirectUri);
    },
    onSuccess: () => {
      setCompleted(true);
    },
  });
  useEffect(() => {
    if (!completed) {
      return;
    }
    const closeTimer = window.setTimeout(() => window.close(), 10_000);
    return () => window.clearTimeout(closeTimer);
  }, [completed]);
  const error =
    requestId === null ? new Error(t('common.error')) : (details.error ?? approval.error);

  if (completed) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="text-primary size-10" aria-hidden="true" />
          <CardTitle>{t('vscodeAuthorization.successTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-center">
          {t('vscodeAuthorization.successDescription')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="items-center text-center">
        <Code2 className="text-primary size-10" aria-hidden="true" />
        <CardTitle>{t('vscodeAuthorization.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-center">
        <p className="text-muted-foreground">{t('vscodeAuthorization.description')}</p>
        {details.data ? (
          <p className="font-medium">
            {t('vscodeAuthorization.requestFor', { client: details.data.clientName })}
          </p>
        ) : null}
        {details.isLoading ? <LoadingSpinner label={t('common.loading')} /> : null}
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {t('vscodeAuthorization.errorTitle')}: {error.message}
          </p>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={!details.data || approval.isPending}
          onClick={() => approval.mutate()}
        >
          {approval.isPending
            ? t('vscodeAuthorization.approving')
            : t('vscodeAuthorization.approve')}
        </Button>
      </CardFooter>
    </Card>
  );
}
