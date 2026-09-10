import { Send } from 'lucide-react';

import { ComposerDropzone } from '@/components/chat/composer-dropzone';
import { ComposerToolbar } from '@/components/chat/composer-toolbar';
import { RichPromptTextarea } from '@/components/chat/rich-prompt-textarea';
import { Button } from '@/components/ui/button';
import { useMessageComposer } from '@/hooks/chat/use-message-composer';
import type { MessageComposerProps } from '@/types';

/**
 * The chat composer, as a card that sits at the foot of the conversation.
 *
 * Pure render composition with exactly one controller hook, per the frontend
 * TSX rule. It has no height of its own: the textarea grows with its content
 * between COMPOSER_MIN_ROWS and COMPOSER_MAX_ROWS and then scrolls internally,
 * so an empty composer is two rows tall and a twenty-line prompt cannot eat the
 * conversation. The drag handle that used to set a fixed pixel height was
 * removed with ADR-088.
 *
 * It stays in normal flow — a flex child of the chat shell, not a fixed
 * overlay. That is what guarantees the last message is always scrollable above
 * it: the message viewport shrinks by exactly the composer's height through
 * ordinary layout, with no clearance variable to keep in step.
 */
export function MessageComposer(props: MessageComposerProps): React.ReactElement {
  const composer = useMessageComposer(props);

  return (
    <ComposerDropzone
      onFiles={composer.onIngestFiles}
      disabled={composer.isPending}
      className="safe-bottom w-full"
    >
      <form
        onSubmit={composer.onFormSubmit}
        // The composer owns the bottom-end corner on a phone, so the floating
        // feedback rail lifts above it instead of landing on its controls.
        // See rules/36-floating-ui-and-toast-clearance.md.
        data-rail-obstacle=""
        className="border-border/60 bg-card shadow-soft focus-within:border-primary/40 focus-within:ring-primary/15 duration-fast flex flex-col gap-1 rounded-2xl border p-2 transition-colors focus-within:ring-1 sm:p-2.5"
      >
        <RichPromptTextarea
          value={composer.content}
          onChange={composer.onValueChange}
          onSubmit={composer.onSubmitValue}
          placeholder={composer.placeholder}
          ariaLabel={composer.placeholder}
          disabled={composer.isPending}
          minRows={composer.minRows}
          maxRows={composer.maxRows}
          // Strips the shadcn field frame — the card around it is the frame
          // now — and turns off the native drag handle. Dragging is what let
          // the old composer be left in a state the user could not undo, and
          // it fights the autosize latch in useRichPromptTextarea. One text
          // size at every breakpoint on purpose: the autosize pass measures
          // line-height once, so a responsive font would leave the row cap
          // computed against the wrong line.
          className="min-h-0 resize-none border-0 bg-transparent px-2 py-1.5 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        <div className="flex items-center gap-2">
          <ComposerToolbar {...composer.toolbarProps} />
          <Button
            type="submit"
            size="icon"
            aria-label={composer.sendLabel}
            className="duration-fast touch:h-11 touch:w-11 h-9 w-9 shrink-0 rounded-xl transition-transform hover:scale-105 active:scale-95"
            disabled={!composer.canSubmit}
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">{composer.sendLabel}</span>
          </Button>
        </div>

        {composer.validationError !== null ? (
          <p className="text-destructive px-2 text-sm">{composer.validationError}</p>
        ) : null}
        {composer.uploadingLabel !== null ? (
          <p className="text-muted-foreground px-2 text-xs" aria-live="polite">
            {composer.uploadingLabel}
          </p>
        ) : null}
      </form>
    </ComposerDropzone>
  );
}
