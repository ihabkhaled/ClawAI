'use client';

import { CheckCircle2, Code2 } from 'lucide-react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useVscodeAuthorizationPage } from '@/hooks/vscode-authorization/use-vscode-authorization-page';

export default function VscodeAuthorizationPage(): React.ReactElement {
  const { details, isLoadingDetails, isApproving, completed, errorMessage, approve, t } =
    useVscodeAuthorizationPage();

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
        {details ? (
          <p className="font-medium">
            {t('vscodeAuthorization.requestFor', { client: details.clientName })}
          </p>
        ) : null}
        {isLoadingDetails ? <LoadingSpinner label={t('common.loading')} /> : null}
        {errorMessage === null ? null : (
          <p role="alert" className="text-destructive text-sm">
            {t('vscodeAuthorization.errorTitle')}: {errorMessage}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button className="w-full" disabled={!details || isApproving} onClick={approve}>
          {isApproving ? t('vscodeAuthorization.approving') : t('vscodeAuthorization.approve')}
        </Button>
      </CardFooter>
    </Card>
  );
}
