import { Check, Circle } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PasswordRulesChecklistProps } from '@/types/component.types';

/**
 * The password floor, ticked off live as the user types.
 *
 * Shows every rule up front so nobody has to submit to learn the policy. Each
 * row carries a screen-reader status word, because a colour or an icon alone
 * says nothing to someone who cannot see it.
 */
export function PasswordRulesChecklist({
  rules,
  id,
  t,
}: PasswordRulesChecklistProps): React.ReactElement {
  return (
    <div id={id} className="space-y-1">
      <p className="text-muted-foreground text-xs">{t('auth.signup.passwordRulesTitle')}</p>
      <ul className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className={cn(
              'flex items-center gap-1.5 text-xs',
              rule.isMet ? 'text-success' : 'text-muted-foreground',
            )}
          >
            {rule.isMet ? (
              <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Circle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{t(rule.labelKey)}</span>
            <span className="sr-only">
              {rule.isMet ? t('auth.signup.ruleMet') : t('auth.signup.ruleNotMet')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
