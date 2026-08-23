import { DeploymentCredentialSource } from '@claw/shared-types';
import { Check, KeyRound, Loader2, ShieldAlert, Trash2, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { DeploymentCredentialsCardProps } from '@/types/deployment-page.types';

export function DeploymentCredentialsCard({
  t,
  locale,
  status,
  credentials,
}: DeploymentCredentialsCardProps): React.ReactElement {
  const installed = status.credentials;
  const isStored = installed.source === DeploymentCredentialSource.DATABASE;
  const savedAt = installed.updatedAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(installed.updatedAt),
      )
    : null;

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="text-primary h-4 w-4" aria-hidden="true" />
          {t('adminDeployment.credentialsTitle')}
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          {t('adminDeployment.credentialsDescription')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {credentials.isEditing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="deployment-repository"
                  className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
                >
                  {t('adminDeployment.credentialsRepository')}
                </label>
                <Input
                  id="deployment-repository"
                  value={credentials.repository}
                  onChange={(event) => credentials.setRepository(event.target.value)}
                  placeholder="owner/repo"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="deployment-ref"
                  className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
                >
                  {t('adminDeployment.credentialsRef')}
                </label>
                <Input
                  id="deployment-ref"
                  value={credentials.ref}
                  onChange={(event) => credentials.setRef(event.target.value)}
                  placeholder="main"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="deployment-token"
                className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
              >
                {t('adminDeployment.credentialsToken')}
              </label>
              <Input
                id="deployment-token"
                type="password"
                value={credentials.token}
                onChange={(event) => credentials.setToken(event.target.value)}
                placeholder={
                  isStored
                    ? t('adminDeployment.credentialsTokenKeep')
                    : t('adminDeployment.credentialsTokenPlaceholder')
                }
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
              <p className="text-muted-foreground text-xs">
                {t('adminDeployment.credentialsTokenHint')}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="w-full gap-2 sm:w-auto"
                onClick={credentials.save}
                disabled={!credentials.canSave || credentials.isSaving}
              >
                {credentials.isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
                {t('adminDeployment.credentialsSave')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full gap-2 sm:w-auto"
                onClick={credentials.cancelEditing}
                disabled={credentials.isSaving}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {t('adminDeployment.credentialsCancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={installed.isUsable ? 'success' : 'warning'}>
                {t(`adminDeployment.credentialsSource.${installed.source}`)}
              </Badge>
              {installed.isUsable ? null : (
                <span className="text-warning inline-flex items-center gap-1.5 text-xs">
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('adminDeployment.credentialsUnusable')}
                </span>
              )}
            </div>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground text-xs">
                  {t('adminDeployment.credentialsRepository')}
                </dt>
                <dd className="mt-0.5 font-mono break-all">
                  {installed.repository ?? t('adminDeployment.notAvailable')}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">
                  {t('adminDeployment.credentialsRef')}
                </dt>
                <dd className="mt-0.5 font-mono">
                  {installed.ref ?? t('adminDeployment.notAvailable')}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">
                  {t('adminDeployment.credentialsToken')}
                </dt>
                <dd className="mt-0.5 font-mono">
                  {installed.tokenLastFour
                    ? `••••${installed.tokenLastFour}`
                    : t('adminDeployment.notAvailable')}
                </dd>
              </div>
            </dl>
            {savedAt ? (
              <p className="text-muted-foreground text-xs">
                {t('adminDeployment.credentialsSavedAt')} {savedAt}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 sm:w-auto"
                onClick={credentials.startEditing}
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                {isStored
                  ? t('adminDeployment.credentialsReplace')
                  : t('adminDeployment.credentialsConfigure')}
              </Button>
              {isStored ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive w-full gap-2 sm:w-auto"
                  onClick={credentials.clear}
                  disabled={credentials.isClearing}
                >
                  {credentials.isClearing ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  {t('adminDeployment.credentialsClear')}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
