'use client';

import { SecurityEmailCheckOutcome } from '@/components/admin/security/security-email-check-outcome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EMAIL_CHECK_VALUE_MAX_LENGTH } from '@/constants/admin-security-settings.constants';
import type { SecurityEmailDomainToolsProps } from '@/types/admin-security-settings.types';

/**
 * Below the Email domains fields: the built-in throwaway list, which is always
 * on (so empty lists above do not mean nothing is blocked), and a box that
 * checks what a sign-up with an address or domain would get. Open to anyone who
 * can view the page; it changes nothing.
 */
export function SecurityEmailDomainTools({
  tools,
  t,
}: SecurityEmailDomainToolsProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-3 border-t pt-4" data-testid="security-email-tools">
      {tools.builtInCount === null ? null : (
        <p className="text-sm" data-testid="security-built-in-count">
          {t('adminSecurity.emailCheck.builtInCount', { count: tools.builtInCount })}
        </p>
      )}
      <form onSubmit={tools.submit} noValidate className="flex min-w-0 flex-col gap-2">
        <label htmlFor="security-email-check" className="text-sm leading-none font-medium">
          {t('adminSecurity.emailCheck.label')}
        </label>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <Input
            id="security-email-check"
            inputMode="email"
            autoComplete="off"
            spellCheck={false}
            maxLength={EMAIL_CHECK_VALUE_MAX_LENGTH}
            value={tools.value}
            placeholder={t('adminSecurity.emailCheck.placeholder')}
            aria-describedby="security-email-check-help"
            onChange={(event) => tools.setValue(event.target.value)}
          />
          <Button
            type="submit"
            variant="outline"
            disabled={!tools.canSubmit || tools.isChecking}
            isLoading={tools.isChecking}
          >
            {tools.isChecking
              ? t('adminSecurity.emailCheck.checking')
              : t('adminSecurity.emailCheck.submit')}
          </Button>
        </div>
        <p id="security-email-check-help" className="text-muted-foreground text-xs">
          {t('adminSecurity.emailCheck.help')}
        </p>
      </form>
      <div aria-live="polite">
        {tools.outcome === null ? null : (
          <SecurityEmailCheckOutcome outcome={tools.outcome} t={t} />
        )}
      </div>
    </div>
  );
}
