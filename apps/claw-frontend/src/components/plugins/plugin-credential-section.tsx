import { Button } from '@/components/ui/button';
import type { PluginCredentialSectionProps } from '@/types/plugin-installs.types';

import { PluginCredentialInput } from './plugin-credential-input';

/** Replace or remove the stored API key. The saved key is never shown; only that one exists. */
export function PluginCredentialSection({
  install,
  sheet,
}: PluginCredentialSectionProps): React.ReactElement {
  const { t } = sheet;
  const hasCredential = install.credential.hasCredential;
  return (
    <div className="space-y-3">
      <PluginCredentialInput
        id="plugin-settings-credential"
        value={sheet.credentialDraft}
        onChange={sheet.setCredentialDraft}
        hasCredential={hasCredential}
        t={t}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={sheet.isCredentialBusy || sheet.credentialDraft.trim().length === 0}
          onClick={sheet.saveCredential}
        >
          {hasCredential
            ? t('pluginsInstall.sheet.credentialReplace')
            : t('pluginsInstall.sheet.credentialSave')}
        </Button>
        {hasCredential ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={sheet.isCredentialBusy}
            onClick={sheet.removeCredential}
          >
            {t('pluginsInstall.sheet.credentialRemove')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
