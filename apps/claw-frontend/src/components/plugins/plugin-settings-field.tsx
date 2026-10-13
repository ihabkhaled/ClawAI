import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PluginSettingsFieldKind } from '@/enums/plugin-settings-field-kind.enum';
import type { PluginSettingsFieldProps } from '@/types/plugin-installs.types';
import { numberInputMode, textMaxLength } from '@/utilities/plugin-settings-form.utility';

/** One generated settings control: text, number, switch or choice. An error is text under it. */
export function PluginSettingsField({
  field,
  value,
  error,
  onChange,
  t,
}: PluginSettingsFieldProps): React.ReactElement {
  const id = `plugin-setting-${field.key}`;
  const errorId = `${id}-error`;
  const describedBy = error === undefined ? undefined : errorId;
  const text = typeof value === 'string' ? value : '';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="min-w-0 text-sm font-medium break-words">
          {field.label}
        </label>
        {field.kind === PluginSettingsFieldKind.Boolean ? (
          <Switch
            id={id}
            checked={value === true}
            onCheckedChange={(next) => onChange(field.key, next)}
          />
        ) : null}
      </div>
      {field.description.length > 0 ? (
        <p className="text-muted-foreground text-xs">{field.description}</p>
      ) : null}
      {field.kind === PluginSettingsFieldKind.Select ? (
        <Select value={text} onValueChange={(next) => onChange(field.key, next)}>
          <SelectTrigger id={id} aria-describedby={describedBy}>
            <SelectValue placeholder={t('pluginsInstall.sheet.choose')} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {field.kind === PluginSettingsFieldKind.Text ||
      field.kind === PluginSettingsFieldKind.Number ? (
        <Input
          id={id}
          type={field.kind === PluginSettingsFieldKind.Number ? 'number' : 'text'}
          inputMode={numberInputMode(field)}
          min={field.min}
          max={field.max}
          minLength={field.minLength}
          maxLength={textMaxLength(field)}
          value={text}
          aria-invalid={error !== undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      ) : null}
      {error === undefined ? null : (
        <p id={errorId} role="alert" className="text-destructive text-xs">
          {t(error, { min: field.min ?? field.minLength ?? '', max: field.max ?? '' })}
        </p>
      )}
    </div>
  );
}
