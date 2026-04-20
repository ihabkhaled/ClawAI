'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DynamicConfigForm } from '@/components/workspace-providers/dynamic-config-form';
import type { WorkspaceProviderAuthMode } from '@/enums/workspace-provider-auth-mode.enum';
import type { AppConfigCreateDialogProps } from '@/types';

export function AppConfigCreateDialog({
  open,
  onOpenChange,
  providers,
  selectedProvider,
  form,
  fieldErrors,
  onSetFormProvider,
  onSetFormAuthMode,
  onSetField,
  onSetPublicField,
  onSetSecretField,
  onSubmit,
  isPending,
  t,
}: AppConfigCreateDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('workspaceProviders.appConfigs.createTitle')}</DialogTitle>
          <DialogDescription>
            {t('workspaceProviders.appConfigs.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="provider-select" className="text-sm font-medium">
              {t('workspaceProviders.appConfigs.provider')}
              <span className="ml-1 text-destructive">*</span>
            </label>
            <Select value={form.provider} onValueChange={onSetFormProvider}>
              <SelectTrigger id="provider-select">
                <SelectValue placeholder={t('workspaceProviders.appConfigs.providerPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.provider}>
                    {p.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="config-name" className="text-sm font-medium">
              {t('workspaceProviders.appConfigs.name')}
              <span className="ml-1 text-destructive">*</span>
            </label>
            <Input
              id="config-name"
              value={form.name}
              placeholder={t('workspaceProviders.appConfigs.namePlaceholder')}
              onChange={(e) => onSetField('name', e.target.value)}
            />
            {fieldErrors.name !== undefined ? (
              <p className="text-xs text-destructive">{fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="config-description" className="text-sm font-medium">
              {t('workspaceProviders.appConfigs.descriptionLabel')}
            </label>
            <Textarea
              id="config-description"
              value={form.description}
              placeholder={t('workspaceProviders.appConfigs.descriptionPlaceholder')}
              onChange={(e) => onSetField('description', e.target.value)}
              rows={2}
            />
          </div>

          {selectedProvider !== null && selectedProvider.authModes.length > 1 ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="auth-mode" className="text-sm font-medium">
                {t('workspaceProviders.appConfigs.authMode')}
              </label>
              <Select
                value={form.authMode}
                onValueChange={(v) => onSetFormAuthMode(v as WorkspaceProviderAuthMode)}
              >
                <SelectTrigger id="auth-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedProvider.authModes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {selectedProvider !== null ? (
            <DynamicConfigForm
              schema={selectedProvider.configSchema}
              authMode={form.authMode}
              publicValues={form.publicConfig}
              secretValues={form.secretConfig}
              onPublicChange={onSetPublicField}
              onSecretChange={onSetSecretField}
              fieldErrors={fieldErrors}
              t={t}
            />
          ) : null}

          {fieldErrors._form !== undefined ? (
            <p className="text-xs text-destructive">{fieldErrors._form}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={isPending || form.provider.length === 0}>
            {isPending
              ? t('workspaceProviders.appConfigs.creating')
              : t('workspaceProviders.appConfigs.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
