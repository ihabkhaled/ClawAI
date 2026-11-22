'use client';

import { SearchCheck } from 'lucide-react';
import type { ReactElement } from 'react';

import { ModelVisibilityDialog } from '@/components/admin/connectors/model-visibility-dialog';
import { Button } from '@/components/ui/button';
import { useToggle } from '@/hooks/common/use-toggle';
import type { ModelVisibilityButtonProps } from '@/types/model-visibility.types';

/** "Why hidden?": opens the picker-gate diagnostic for one model, fetched on open. */
export function ModelVisibilityButton({
  provider,
  modelKey,
  t,
}: ModelVisibilityButtonProps): ReactElement {
  const dialog = useToggle();
  return (
    <>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="touch:min-h-11 h-auto gap-1 px-0 text-xs"
        onClick={dialog.open}
        data-testid="model-visibility-button"
      >
        <SearchCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {t('adminConnectors.visibility.whyHidden')}
      </Button>
      {dialog.isOpen ? (
        <ModelVisibilityDialog
          provider={provider}
          modelKey={modelKey}
          onClose={dialog.close}
          t={t}
        />
      ) : null}
    </>
  );
}
