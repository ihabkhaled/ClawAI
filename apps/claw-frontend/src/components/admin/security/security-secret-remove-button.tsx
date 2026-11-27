'use client';

import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { SecuritySecretRemoveButtonProps } from '@/types/admin-security-settings.types';

/**
 * Removes a secret saved on this page, at once and without a dialog: the
 * server's key (if one is set) takes over, otherwise the provider turns off.
 * Shown only for a secret saved here and only to an admin who can edit.
 */
export function SecuritySecretRemoveButton({
  fieldKey,
  isRemoving,
  disabled,
  onRemove,
  t,
}: SecuritySecretRemoveButtonProps): React.ReactElement {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive"
      isLoading={isRemoving}
      disabled={disabled || isRemoving}
      data-testid={`security-remove-secret-${fieldKey}`}
      onClick={() => onRemove(fieldKey)}
    >
      {isRemoving ? null : <Trash2 className="size-4" aria-hidden="true" />}
      {t('adminSecurity.removeSecret.action')}
    </Button>
  );
}
