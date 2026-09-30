import { PromptTemplateFillForm } from '@/components/chat/prompt-library/prompt-template-fill-form';
import { PromptTemplateForm } from '@/components/chat/prompt-library/prompt-template-form';
import { PromptTemplateList } from '@/components/chat/prompt-library/prompt-template-list';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PromptLibraryView } from '@/enums/prompt-library.enum';
import { useTranslation } from '@/lib/i18n';
import type { PromptLibraryDialogProps } from '@/types';

/** The prompt library: list, create/edit form, or the fill-variables step. */
export function PromptLibraryDialog(props: PromptLibraryDialogProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('promptLibrary.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('promptLibrary.dialogDescription')}</DialogDescription>
        </DialogHeader>
        {props.view === PromptLibraryView.List ? <PromptTemplateList {...props} /> : null}
        {props.view === PromptLibraryView.Form ? (
          <PromptTemplateForm
            editing={props.editing}
            isSaving={props.isSaving}
            onSave={props.onSave}
            onBack={props.onBack}
          />
        ) : null}
        {props.view === PromptLibraryView.Fill && props.filling !== null ? (
          <PromptTemplateFillForm
            template={props.filling}
            onSubmit={props.onSubmitFill}
            onBack={props.onBack}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
