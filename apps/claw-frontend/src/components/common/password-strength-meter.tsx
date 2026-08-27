'use client';

import { PasswordStrengthLevel } from '@/enums/password-strength-level.enum';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { PasswordStrengthMeterProps } from '@/types/component.types';
import { resolvePasswordStrengthPresentation } from '@/utilities/password-strength-presentation.utility';

export function PasswordStrengthMeter({
  strength,
  showRequirements = true,
}: PasswordStrengthMeterProps): React.ReactElement {
  const { t } = useTranslation();
  const presentation = resolvePasswordStrengthPresentation(strength);

  return (
    <div className="space-y-2">
      <div
        className="flex gap-1"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={strength.score}
        aria-label={t('admin.createUserPasswordStrength')}
      >
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              segment <= strength.score ? presentation.barClassName : 'bg-muted',
            )}
          />
        ))}
      </div>

      <p
        className={cn(
          'text-xs',
          strength.level === PasswordStrengthLevel.Weak
            ? 'text-muted-foreground'
            : presentation.labelClassName,
        )}
      >
        {t(presentation.labelKey)}
      </p>

      {showRequirements && !strength.meetsPolicy ? (
        <ul className="text-muted-foreground space-y-0.5 text-xs">
          {presentation.unmetRequirementKeys.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
