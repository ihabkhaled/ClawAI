'use client';

import { PasswordInput } from '@/components/common/password-input';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SecuritySettingKind } from '@/enums/security-setting-kind.enum';
import type { SecuritySettingInputProps } from '@/types/admin-security-settings.types';

/**
 * One setting. A secret is write-only: the box is always empty, its placeholder
 * says whether a value is stored, and anything typed replaces it on save. Other
 * fields show the auth-service default as their placeholder, since an empty
 * value means "use the default".
 */
export function SecuritySettingInput({
  field,
  value,
  error,
  isSecretConfigured,
  disabled,
  onChange,
  t,
}: SecuritySettingInputProps): React.ReactElement {
  const inputId = `security-setting-${field.key}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const describedBy =
    [field.helpKey === null ? '' : helpId, error === undefined ? '' : errorId]
      .filter((id) => id.length > 0)
      .join(' ') || undefined;
  const isSecret = field.kind === SecuritySettingKind.SECRET;
  const isList = field.kind === SecuritySettingKind.DOMAIN_LIST;

  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={inputId} className="text-sm leading-none font-medium">
        {t(field.labelKey)}
      </label>
      {isSecret ? (
        <PasswordInput
          id={inputId}
          autoComplete="new-password"
          value={value}
          placeholder={
            isSecretConfigured
              ? t('adminSecurity.fields.secretConfigured')
              : t('adminSecurity.fields.secretNotConfigured')
          }
          disabled={disabled}
          error={error !== undefined}
          aria-describedby={describedBy}
          data-testid={`security-secret-${field.key}`}
          data-configured={isSecretConfigured}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      ) : null}
      {isList ? (
        <Textarea
          id={inputId}
          rows={3}
          value={value}
          disabled={disabled}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={describedBy}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      ) : null}
      {isSecret || isList ? null : (
        <Input
          id={inputId}
          value={value}
          placeholder={
            field.defaultValue === ''
              ? undefined
              : t('adminSecurity.fields.defaultPlaceholder', { value: field.defaultValue })
          }
          inputMode={field.kind === SecuritySettingKind.TEXT ? undefined : 'decimal'}
          disabled={disabled}
          error={error !== undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      )}
      {field.helpKey === null ? null : (
        <p id={helpId} className="text-muted-foreground text-xs">
          {t(field.helpKey)}
        </p>
      )}
      {error === undefined ? null : (
        <p id={errorId} className="text-destructive text-xs">
          {t(error.key, error.params)}
        </p>
      )}
    </div>
  );
}
