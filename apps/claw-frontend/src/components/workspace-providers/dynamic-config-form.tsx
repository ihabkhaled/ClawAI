'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { WorkspaceProviderFieldType } from '@/enums/workspace-provider-field-type.enum';
import type { DynamicConfigFormProps } from '@/types';
import {
  isFieldApplicableToAuthMode,
  resolveFieldInputType,
} from '@/utilities/workspace-provider-field.utility';

export function DynamicConfigForm({
  schema,
  authMode,
  publicValues,
  secretValues,
  onPublicChange,
  onSecretChange,
  fieldErrors,
  t,
}: DynamicConfigFormProps): React.ReactElement {
  const applicable = schema.fields.filter((f) => isFieldApplicableToAuthMode(f, authMode));

  return (
    <div className="flex flex-col gap-4">
      {applicable.map((field) => {
        const value = field.secret
          ? (secretValues[field.key] ?? '')
          : (publicValues[field.key] ?? '');
        const error = fieldErrors[field.key];
        const handleChange = (
          e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
        ): void => {
          if (field.secret) {
            onSecretChange(field.key, e.target.value);
          } else {
            onPublicChange(field.key, e.target.value);
          }
        };
        return (
          <div key={field.key} className="flex flex-col gap-1">
            <label htmlFor={`field-${field.key}`} className="text-sm font-medium">
              {field.label}
              {field.required ? <span className="ml-1 text-destructive">*</span> : null}
              {field.secret ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  {t('workspaceProviders.appConfigs.fields.secret')}
                </span>
              ) : null}
            </label>
            {field.type === WorkspaceProviderFieldType.TEXTAREA ? (
              <Textarea
                id={`field-${field.key}`}
                value={value}
                placeholder={field.placeholder}
                onChange={handleChange}
                rows={4}
              />
            ) : (
              <Input
                id={`field-${field.key}`}
                type={resolveFieldInputType(field)}
                value={value}
                placeholder={field.placeholder}
                onChange={handleChange}
              />
            )}
            {field.helpText !== undefined ? (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            ) : null}
            {error !== undefined ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
