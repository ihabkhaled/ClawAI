import { Upload } from 'lucide-react';

import { useComposerDropzone } from '@/hooks/files/use-composer-dropzone';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ComposerDropzoneProps } from '@/types';

// Wraps any composer surface to add clipboard-paste + drag-and-drop file
// ingestion. Paste/drag/drop handlers live in useComposerDropzone; this file is
// pure render composition. Captured files are forwarded to `onFiles` — the host
// uploads-and-attaches them via useComposerAttachments.
export function ComposerDropzone({
  onFiles,
  disabled,
  className,
  overlayLabel,
  children,
}: ComposerDropzoneProps): React.ReactElement {
  const { t } = useTranslation();
  const {
    isDragActive,
    handlePaste,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  } = useComposerDropzone({ onFiles, disabled });

  return (
    <div
      className={cn('relative', className)}
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDragActive ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium text-primary shadow-soft">
            <Upload className="h-4 w-4" aria-hidden />
            {overlayLabel ?? t('chat.attachment.dropToAttach')}
          </div>
        </div>
      ) : null}
    </div>
  );
}
