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
  acceptPaste = true,
  acceptDrop = true,
  testId,
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
      data-testid={testId}
      onPaste={acceptPaste ? handlePaste : undefined}
      onDragOver={acceptDrop ? handleDragOver : undefined}
      onDragEnter={acceptDrop ? handleDragEnter : undefined}
      onDragLeave={acceptDrop ? handleDragLeave : undefined}
      onDrop={acceptDrop ? handleDrop : undefined}
    >
      {children}
      {isDragActive ? (
        <div
          className="border-primary bg-primary/10 pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed backdrop-blur-sm"
          data-testid="composer-drop-overlay"
        >
          <div className="bg-card text-primary shadow-soft flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
            <Upload className="h-4 w-4" aria-hidden />
            {overlayLabel ?? t('chat.attachment.dropToAttach')}
          </div>
        </div>
      ) : null}
    </div>
  );
}
