import { KeyRound, Loader2 } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PLUGIN_CREDENTIAL_MAX_LENGTH } from '@/constants/plugin-installs.constants';
import {
  PLUGIN_SERVER_HEADER_NAME_MAX_LENGTH,
  PLUGIN_SERVER_NAME_MAX_LENGTH,
  PLUGIN_SERVER_URL_MAX_LENGTH,
} from '@/constants/plugin-servers.constants';
import { AlertVariant } from '@/enums/alert-variant.enum';
import type { AddPluginServerFormProps } from '@/types/plugin-servers.types';

/** The first step: name, https address, an optional header key (write-only) and the risk consent. */
export function AddPluginServerForm({
  state,
  onCancel,
  t,
}: AddPluginServerFormProps): React.ReactElement {
  const { values, setValue } = state;
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        state.submit();
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="plugin-server-name" className="text-sm font-medium">
          {t('pluginsServers.form.nameLabel')}
        </label>
        <Input
          id="plugin-server-name"
          value={values.name}
          maxLength={PLUGIN_SERVER_NAME_MAX_LENGTH}
          placeholder={t('pluginsServers.form.namePlaceholder')}
          onChange={(event) => {
            setValue('name', event.target.value);
          }}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="plugin-server-url" className="text-sm font-medium">
          {t('pluginsServers.form.urlLabel')}
        </label>
        <Input
          id="plugin-server-url"
          type="url"
          dir="ltr"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={values.url}
          maxLength={PLUGIN_SERVER_URL_MAX_LENGTH}
          placeholder="https://mcp.example.com/mcp"
          aria-describedby="plugin-server-url-help"
          onChange={(event) => {
            setValue('url', event.target.value);
          }}
        />
        <p id="plugin-server-url-help" className="text-muted-foreground text-xs">
          {t('pluginsServers.form.urlHelp')}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          {t('pluginsServers.form.keyTitle')}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="plugin-server-header" className="text-xs font-medium">
              {t('pluginsServers.form.headerLabel')}
            </label>
            <Input
              id="plugin-server-header"
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
              value={values.headerName}
              maxLength={PLUGIN_SERVER_HEADER_NAME_MAX_LENGTH}
              onChange={(event) => {
                setValue('headerName', event.target.value);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="plugin-server-key" className="text-xs font-medium">
              {t('pluginsServers.form.keyLabel')}
            </label>
            <Input
              id="plugin-server-key"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              spellCheck={false}
              value={values.headerValue}
              maxLength={PLUGIN_CREDENTIAL_MAX_LENGTH}
              placeholder={t('pluginsServers.form.keyPlaceholder')}
              onChange={(event) => {
                setValue('headerValue', event.target.value);
              }}
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">{t('pluginsServers.form.keyHelp')}</p>
      </div>

      <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-3">
        <Checkbox
          id="plugin-server-consent"
          checked={values.acknowledged}
          onCheckedChange={(checked) => {
            setValue('acknowledged', checked === true);
          }}
        />
        <label htmlFor="plugin-server-consent" className="text-sm leading-snug">
          <span className="block font-medium">{t('pluginsServers.form.consentLabel')}</span>
          <span className="text-muted-foreground mt-1 block text-xs">
            {t('pluginsServers.form.consentBody')}
          </span>
        </label>
      </div>

      {state.errorMessage === null ? null : (
        <Alert variant={AlertVariant.Error} description={state.errorMessage} />
      )}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('pluginsServers.form.cancel')}
        </Button>
        <Button type="submit" disabled={!state.canSubmit}>
          {state.isSubmitting ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {state.isSubmitting
            ? t('pluginsServers.form.submitting')
            : t('pluginsServers.form.submit')}
        </Button>
      </DialogFooter>
    </form>
  );
}
