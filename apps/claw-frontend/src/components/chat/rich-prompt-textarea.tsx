import { Maximize2, Minimize2 } from 'lucide-react';
import { forwardRef, useImperativeHandle } from 'react';

import { PluginMentionChips } from '@/components/chat/plugin-mention-chips';
import { PluginMentionListbox } from '@/components/chat/plugin-mention-listbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { usePluginMentionBindings } from '@/hooks/chat/use-plugin-mention-bindings';
import { usePluginMentionCombobox } from '@/hooks/chat/use-plugin-mention-combobox';
import { useRichPromptTextarea } from '@/hooks/chat/use-rich-prompt-textarea';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { RichPromptTextareaProps } from '@/types';

/**
 * Shared rich textarea used by both the main chat MessageComposer and the
 * in-thread compare panel. Wraps shadcn <Textarea> with:
 *
 *   - Auto-resize from minRows to maxRows (then internal scroll)
 *   - Desktop: Enter → onSubmit; Shift+Enter / Ctrl+Enter → newline. Touch: Enter → newline
 *   - ArrowUp/ArrowDown walk `recallHistory` (opt-in per consumer)
 *   - IME-safe composition: never submit while a CJK/IME composition is in
 *     flight (tracked via compositionStart/End + nativeEvent.isComposing)
 *   - ref forwarding so parents can imperatively focus the textarea
 *   - opt-in `@` plugin picker (`pluginMentions`): a combobox over the user's installed plugins
 *     that inserts a mention chip; it takes ArrowUp/Down, Enter, Tab and Escape only while open
 *
 * The .tsx is pure render composition; all imperative DOM work (autosize,
 * key handling, composition tracking) lives in useRichPromptTextarea per the
 * "TSX files = render only" rule.
 */
export const RichPromptTextarea = forwardRef<HTMLTextAreaElement, RichPromptTextareaProps>(
  function RichPromptTextarea(props, forwardedRef): React.ReactElement {
    const {
      id,
      value,
      onChange,
      onSubmit,
      placeholder,
      disabled = false,
      minRows,
      maxRows,
      ariaLabel,
      className,
      recallHistory,
      allowEmptySubmit,
      pluginMentions,
    } = props;

    const {
      textareaRef,
      handleChange,
      handleKeyDown,
      handleCompositionStart,
      handleCompositionEnd,
      handlePaste,
      isExpanded,
      canExpand,
      toggleExpanded,
    } = useRichPromptTextarea({
      value,
      onChange,
      onSubmit,
      disabled,
      minRows,
      maxRows,
      recallHistory,
      allowEmptySubmit,
    });

    const mention = usePluginMentionCombobox({
      value,
      onChange,
      textareaRef,
      selection: pluginMentions,
      disabled,
    });
    const bindings = usePluginMentionBindings(mention, {
      onChange: handleChange,
      onKeyDown: handleKeyDown,
      onCompositionStart: handleCompositionStart,
      onCompositionEnd: handleCompositionEnd,
    });
    const { t } = useTranslation();
    const toggleLabel = isExpanded ? t('chat.composerCollapse') : t('chat.composerExpand');
    const ToggleIcon = isExpanded ? Minimize2 : Maximize2;

    // Bridge the internal textareaRef (used for autosize measurements) with
    // the consumer's forwarded ref so callers can still focus/blur the
    // element. useImperativeHandle is the React-19-blessed way to expose a
    // proxy ref without leaking the underlying node identity. The hook
    // returns a stable ref object so depending on it does NOT re-run on
    // every render — it satisfies the exhaustive-deps rule without cost.
    useImperativeHandle(forwardedRef, () => textareaRef.current as HTMLTextAreaElement, [
      textareaRef,
    ]);

    return (
      <div className="relative flex flex-col gap-1">
        {pluginMentions === undefined ? null : (
          <PluginMentionChips
            refs={pluginMentions.refs}
            onRemove={pluginMentions.remove}
            disabled={disabled}
          />
        )}
        {mention.open ? (
          <PluginMentionListbox
            listboxId={mention.listboxId}
            options={mention.options}
            activeIndex={mention.activeIndex}
            onSelect={mention.select}
            onHover={mention.setActiveIndex}
          />
        ) : null}
        <div className="flex items-start gap-1">
          <Textarea
            ref={textareaRef}
            id={id}
            value={value}
            {...mention.aria}
            {...bindings}
            onPaste={handlePaste}
            placeholder={placeholder}
            aria-label={ariaLabel}
            disabled={disabled}
            rows={minRows}
            // Allow vertical drag-resize. Autosize still drives initial height
            // and content-grow up to maxRows; the hook latches "user resized"
            // via ResizeObserver and stops auto-growing once the handle is used.
            className={cn('min-w-0 flex-1 resize-y', className)}
          />
          {canExpand ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleExpanded}
              aria-label={toggleLabel}
              title={toggleLabel}
              aria-pressed={isExpanded}
              className="text-muted-foreground h-7 w-7 shrink-0"
            >
              <ToggleIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
    );
  },
);
