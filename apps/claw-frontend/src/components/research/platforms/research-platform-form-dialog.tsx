import { ResearchPlatformScopeFields } from '@/components/research/platforms/research-platform-scope-fields';
import { ResearchPlatformSourceFields } from '@/components/research/platforms/research-platform-source-fields';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ResearchPlatformFormDialogProps } from '@/types/research-platform.types';

/** Add a platform, or edit one (the slug stays fixed). */
export function ResearchPlatformFormDialog({
  t,
  controller,
}: ResearchPlatformFormDialogProps): React.ReactElement {
  const isEditing = controller.editing !== null;
  return (
    <Dialog open={controller.isOpen} onOpenChange={controller.onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
        data-testid="research-platform-form"
      >
        <DialogHeader>
          <DialogTitle>
            {controller.editing === null
              ? t('researchPlatforms.form.createTitle')
              : t('researchPlatforms.form.editTitle', { name: controller.editing.name })}
          </DialogTitle>
          <DialogDescription>{t('researchPlatforms.form.description')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <ResearchPlatformSourceFields
            t={t}
            form={controller.form}
            setField={controller.setField}
            isEditing={isEditing}
          />
          <ResearchPlatformScopeFields
            t={t}
            form={controller.form}
            setField={controller.setField}
            isEditing={isEditing}
          />
          {controller.errorKey === null ? null : (
            <p
              role="alert"
              data-testid="research-platform-form-error"
              className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-2 text-xs"
            >
              {t(controller.errorKey)}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={controller.close} disabled={controller.isSaving}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => void controller.submit()}
            disabled={controller.isSaving}
            data-testid="research-platform-form-submit"
          >
            {t(controller.submitLabelKey)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
