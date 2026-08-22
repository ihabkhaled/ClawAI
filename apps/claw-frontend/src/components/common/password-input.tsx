'use client';

import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePasswordVisibility } from '@/hooks/ui/use-password-visibility';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { PasswordInputProps } from '@/types/component.types';

export function PasswordInput({
  id,
  className,
  disabled,
  ...rest
}: PasswordInputProps): React.ReactElement {
  const { visible, toggle, inputType } = usePasswordVisibility();
  const { t } = useTranslation();

  return (
    <div className="relative">
      <Input
        id={id}
        type={inputType}
        className={cn('pe-12', className)}
        disabled={disabled}
        {...rest}
      />
      <Button
        variant="unstyled"
        size="unstyled"
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-label={visible ? t('auth.hidePasswordAria') : t('auth.showPasswordAria')}
        aria-pressed={visible}
        className="text-muted-foreground hover:text-foreground focus-visible:text-foreground absolute inset-y-0 end-0 flex min-h-11 min-w-11 items-center justify-center transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}
