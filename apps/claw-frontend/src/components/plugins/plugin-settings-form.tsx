import type { PluginSettingsFormProps } from '@/types/plugin-installs.types';

import { PluginSettingsField } from './plugin-settings-field';

/** The fields drawn from the manifest's settings schema. A plugin with none says so. */
export function PluginSettingsForm({
  fields,
  draft,
  errors,
  onChange,
  t,
}: PluginSettingsFormProps): React.ReactElement {
  if (fields.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{t('pluginsInstall.sheet.settingsNone')}</p>
    );
  }
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <PluginSettingsField
          key={field.key}
          field={field}
          value={draft[field.key] ?? ''}
          error={errors[field.key]}
          onChange={onChange}
          t={t}
        />
      ))}
    </div>
  );
}
