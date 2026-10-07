import { BookText } from 'lucide-react';

import { PromptLibraryDialog } from '@/components/chat/prompt-library/prompt-library-dialog';
import { Button } from '@/components/ui/button';
import { usePromptLibraryController } from '@/hooks/prompt-library/use-prompt-library-controller';
import { useTranslation } from '@/lib/i18n';
import type { PromptLibraryButtonProps } from '@/types';

/** Composer toolbar entry point for the prompt library. */
export function PromptLibraryButton(props: PromptLibraryButtonProps): React.ReactElement {
  const { t } = useTranslation();
  const dialog = usePromptLibraryController(props);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0 gap-1 px-2 lg:px-3"
        disabled={props.disabled}
        aria-label={t('promptLibrary.openLabel')}
        data-tour="composer-prompts"
        title={t('promptLibrary.openLabel')}
        onClick={() => dialog.onOpenChange(true)}
      >
        <BookText className="h-3 w-3" />
        <span className="hidden lg:inline">{t('promptLibrary.openLabel')}</span>
      </Button>
      <PromptLibraryDialog {...dialog} />
    </>
  );
}
