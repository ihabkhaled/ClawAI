import { ArchiveEntryTree } from '@/components/files/archive/archive-entry-tree';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { ArchiveMemberDialogProps } from '@/types/archive.types';

// Pick files from inside an archive, or the whole archive — never both: the
// selection hook drops the other side, so the model is not sent the same file
// twice. A dialog rather than a nested menu because a tree of checkboxes needs
// Tab and room, and a dropdown menu gives it neither on a phone.
//
// Allowed to call useTranslation directly: a leaf with no other hooks; its
// state lives in the picker's controller.
export function ArchiveMemberDialog({
  archive,
  selection,
  onOpenChange,
}: ArchiveMemberDialogProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Dialog open={archive !== null} onOpenChange={onOpenChange}>
      {archive === null ? null : (
        <DialogContent className="sm:max-w-xl" data-testid="archive-member-dialog">
          <DialogHeader>
            <DialogTitle className="break-all">
              {t('files.archive.chooseFilesTitle', { filename: archive.filename })}
            </DialogTitle>
            <DialogDescription>{t('files.archive.chooseFilesDescription')}</DialogDescription>
          </DialogHeader>
          <div className="flex min-w-0 items-center gap-2 rounded-md border p-2">
            <Checkbox
              id="archive-attach-whole"
              checked={selection.isSelected(archive.id)}
              onCheckedChange={(next) => selection.onToggle(archive.id, next === true)}
            />
            <label htmlFor="archive-attach-whole" className="min-w-0 flex-1 text-sm">
              <span className="block font-medium">{t('files.archive.attachWhole')}</span>
              <span className="text-muted-foreground block text-xs">
                {t('files.archive.attachWholeHint')}
              </span>
            </label>
          </div>
          <ArchiveEntryTree
            archiveFileId={archive.id}
            selection={selection}
            className="max-h-[50dvh] overflow-y-auto rounded-md border p-1"
          />
          <DialogFooter>
            <Button
              type="button"
              className="touch:min-h-11 w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              {t('files.archive.done')}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
