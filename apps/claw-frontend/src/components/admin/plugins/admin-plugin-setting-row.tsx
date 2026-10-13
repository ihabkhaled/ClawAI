import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  PLUGIN_SETTING_BOUNDS,
  PLUGIN_SETTING_DEFAULT_BOUNDS,
  PLUGIN_SETTING_LABEL_KEYS,
} from '@/constants/plugin-installs.constants';
import type { AdminPluginSettingRowProps } from '@/types/plugin-installs.types';

/** One PluginSetting: a switch for a flag, a whole-number input for a limit. */
export function AdminPluginSettingRow({
  setting,
  value,
  error,
  onChange,
  t,
}: AdminPluginSettingRowProps): React.ReactElement {
  const id = `plugin-admin-setting-${setting.key}`;
  const labelKey = PLUGIN_SETTING_LABEL_KEYS[setting.key];
  const label = labelKey === undefined ? setting.key : t(labelKey);
  const bounds = PLUGIN_SETTING_BOUNDS[setting.key] ?? PLUGIN_SETTING_DEFAULT_BOUNDS;
  const isFlag = typeof setting.value === 'boolean';

  return (
    <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <label htmlFor={id} className="text-sm font-medium break-words">
          {label}
        </label>
        <code className="text-muted-foreground block text-xs break-all" dir="ltr">
          {setting.key}
        </code>
      </div>
      <div className="sm:w-48">
        {isFlag ? (
          <Switch
            id={id}
            checked={value === true}
            onCheckedChange={(next) => onChange(setting.key, next)}
          />
        ) : (
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            min={bounds.min}
            max={bounds.max}
            value={typeof value === 'string' ? value : ''}
            aria-invalid={error !== undefined}
            aria-describedby={error === undefined ? undefined : `${id}-error`}
            onChange={(event) => onChange(setting.key, event.target.value)}
          />
        )}
        {error === undefined ? null : (
          <p id={`${id}-error`} role="alert" className="text-destructive mt-1 text-xs">
            {t(error, { min: bounds.min, max: bounds.max })}
          </p>
        )}
      </div>
    </div>
  );
}
