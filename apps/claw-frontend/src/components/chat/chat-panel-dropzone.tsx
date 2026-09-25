import { ComposerDropzone } from '@/components/chat/composer-dropzone';
import { useChatPanelDropzone } from '@/hooks/chat/use-chat-panel-dropzone';
import type { ChatPanelDropzoneProps } from '@/types/composer-attachment.types';

/**
 * The whole chat panel — messages and composer — as one drop zone.
 *
 * Dropping used to work only on the composer's few rows; a file let go over
 * the conversation was opened by the browser instead. This wraps the panel in
 * the same ComposerDropzone overlay and hands the files to the composer's own
 * upload pipeline through the drop-target store. Paste stays with the
 * composer, which still owns the textarea.
 */
export function ChatPanelDropzone({
  className,
  children,
}: ChatPanelDropzoneProps): React.ReactElement {
  const { onFiles, disabled } = useChatPanelDropzone();

  return (
    <ComposerDropzone
      onFiles={onFiles}
      disabled={disabled}
      acceptPaste={false}
      className={className}
      testId="chat-panel-dropzone"
    >
      {children}
    </ComposerDropzone>
  );
}
