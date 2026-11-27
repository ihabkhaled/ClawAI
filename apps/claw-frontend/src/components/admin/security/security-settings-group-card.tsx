'use client';

import { SecurityCaptchaStatus } from '@/components/admin/security/security-captcha-status';
import { SecurityEmailDomainTools } from '@/components/admin/security/security-email-domain-tools';
import { SecuritySettingInput } from '@/components/admin/security/security-setting-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SecuritySettingsGroupCardProps } from '@/types/admin-security-settings.types';

/**
 * One card of the Sign-up protection page (proof of work, Turnstile, reCAPTCHA,
 * email, limits). A captcha card also says what is in force; the Email domains
 * card adds the built-in list size and the address check.
 */
export function SecuritySettingsGroupCard({
  group,
  values,
  errors,
  secretStatus,
  placeholders,
  captchaStatus,
  emailTools,
  disabled,
  onChange,
  t,
}: SecuritySettingsGroupCardProps): React.ReactElement {
  return (
    <Card data-testid={`security-group-${group.definition.group}`}>
      <CardHeader>
        <CardTitle className="text-base">{t(group.definition.titleKey)}</CardTitle>
        <CardDescription>{t(group.definition.descriptionKey)}</CardDescription>
        {captchaStatus === undefined ? null : (
          <SecurityCaptchaStatus
            status={captchaStatus}
            testId={`security-status-${group.definition.group}`}
            t={t}
          />
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {group.fields.map((field) => (
          <SecuritySettingInput
            key={field.key}
            field={field}
            value={values[field.key]}
            error={errors[field.key]}
            placeholder={placeholders[field.key]}
            isSecretConfigured={secretStatus[field.key] === true}
            disabled={disabled}
            onChange={onChange}
            t={t}
          />
        ))}
      </CardContent>
      {emailTools === undefined ? null : (
        <CardContent>
          <SecurityEmailDomainTools tools={emailTools} t={t} />
        </CardContent>
      )}
    </Card>
  );
}
