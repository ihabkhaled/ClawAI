import { Dialog } from '@/components/ui/dialog';
import type { FileLibraryDialogProps } from '@/types/file-library-ui.types';

import { FileLibraryDialogBody } from './file-library-dialog-body';

/**
 * Browse every file: search, type chips, grid or list, multi-select, and an
 * upload target. Picks stay a draft until "Attach N". The list region is
 * flex-1 / min-h-0 / overflow-auto inside a flex column, so it takes whatever
 * the dialog has left and scrolls; it never carries a viewport-height of its own.
 */
export function FileLibraryDialog({
  open,
  onOpenChange,
  onDone,
  selectedFileIds,
  onChange,
  ingestFiles,
  isUploading,
  disabled,
}: FileLibraryDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <FileLibraryDialogBody
          onOpenChange={onOpenChange}
          onDone={onDone}
          selectedFileIds={selectedFileIds}
          onChange={onChange}
          ingestFiles={ingestFiles}
          isUploading={isUploading}
          disabled={disabled}
        />
      ) : null}
    </Dialog>
  );
}
