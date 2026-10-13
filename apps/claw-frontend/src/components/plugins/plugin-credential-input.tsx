import { KeyRound } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PLUGIN_CREDENTIAL_MAX_LENGTH } from '@/constants/plugin-installs.constants';
import type { PluginCredentialInputProps } from '@/types/plugin-installs.types';

/**
 * A write-only key field. It shows what the user is typing and nothing else: a saved key
 * is never sent back by the server, so the only thing to show for one is "saved".
 */
export function PluginCredentialInput({
  id,
  value,
  onChange,
  hasCredential,
  t,
}: PluginCredentialInputProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          {t('pluginsInstall.credential.label')}
        </label>
        <Badge variant={hasCredential ? 'success' : 'outline'}>
          {hasCredential
            ? t('pluginsInstall.credential.saved')
            : t('pluginsInstall.credential.notSet')}
        </Badge>
      </div>
      <Input
        id={id}
        type="password"
        dir="ltr"
        autoComplete="new-password"
        spellCheck={false}
        maxLength={PLUGIN_CREDENTIAL_MAX_LENGTH}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={
          hasCredential
            ? t('pluginsInstall.credential.replacePlaceholder')
            : t('pluginsInstall.credential.placeholder')
        }
        aria-describedby={`${id}-help`}
      />
      <p id={`${id}-help`} className="text-muted-foreground text-xs">
        {t('pluginsInstall.credential.help')}
      </p>
    </div>
  );
}
