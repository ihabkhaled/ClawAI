import { useCallback, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import {
  PLUGIN_MENTION_LISTBOX_SUFFIX,
  PLUGIN_MENTION_NO_OPTIONS,
} from '@/constants/plugin-mention.constants';
import { PluginMentionRole } from '@/enums/plugin-mention-role.enum';
import type {
  PluginMentionActiveState,
  PluginMentionComboboxAria,
  UsePluginMentionComboboxParams,
  UsePluginMentionComboboxReturn,
} from '@/types/plugin-mention.types';
import {
  applyMention,
  filterMentionOptions,
  findMentionTrigger,
  mentionLabel,
} from '@/utilities/plugin-mention.utility';

/**
 * The `@` picker for one textarea, as a WAI-ARIA combobox: the textarea owns focus and carries
 * `aria-expanded`, `aria-controls` and `aria-activedescendant`; the list is a `listbox`.
 *
 * While it is open it takes ArrowUp, ArrowDown, Enter, Tab and Escape, and nothing else, so with
 * it closed (or no match) every key keeps its ordinary meaning, Enter still sends. Escape closes
 * it without touching the text. It never opens during IME composition and re-evaluates when the
 * composition ends. Plugins already chosen are not offered again.
 */
export function usePluginMentionCombobox({
  value,
  onChange,
  textareaRef,
  selection,
  disabled,
}: UsePluginMentionComboboxParams): UsePluginMentionComboboxReturn {
  const listboxId = `${useId()}-${PLUGIN_MENTION_LISTBOX_SUFFIX}`;
  const enabled = selection !== undefined && !disabled;
  const [caret, setCaret] = useState<number | null>(null);
  const [dismissedStart, setDismissedStart] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [activeState, setActiveState] = useState<PluginMentionActiveState>({ query: '', index: 0 });
  const composingRef = useRef(false);

  const trigger = enabled && !composing && caret !== null ? findMentionTrigger(value, caret) : null;
  const fetched = selection?.options ?? PLUGIN_MENTION_NO_OPTIONS;
  const chosenIds = useMemo(
    () => new Set((selection?.refs ?? []).map((ref) => ref.installId)),
    [selection?.refs],
  );
  const options = useMemo(
    () =>
      trigger === null || selection?.isFull === true
        ? []
        : filterMentionOptions(fetched, trigger.query, chosenIds),
    [chosenIds, fetched, selection?.isFull, trigger],
  );
  const open = trigger !== null && trigger.start !== dismissedStart && options.length > 0;
  const activeIndex =
    trigger !== null && activeState.query === trigger.query
      ? Math.min(activeState.index, Math.max(options.length - 1, 0))
      : 0;

  const setActiveIndex = useCallback(
    (index: number): void => {
      setActiveState({ query: trigger?.query ?? '', index });
    },
    [trigger?.query],
  );

  const syncCaret = useCallback((): void => {
    const element = textareaRef.current;
    if (!enabled || element === null) {
      return;
    }
    setCaret(element.selectionStart);
    if (findMentionTrigger(element.value, element.selectionStart) !== null) {
      selection?.arm();
    }
    // Once the user has left the token, a later "@" is a fresh one, not the one they dismissed.
    if (findMentionTrigger(element.value, element.selectionStart) === null) {
      setDismissedStart(null);
    }
  }, [enabled, selection, textareaRef]);

  const select = useCallback(
    (index: number): void => {
      const option = options[index];
      if (option === undefined || trigger === null || selection === undefined) {
        return;
      }
      const edit = applyMention(value, trigger, mentionLabel(option));
      selection.add(option, value);
      onChange(edit.value);
      setCaret(edit.caret);
      globalThis.requestAnimationFrame(() => {
        const element = textareaRef.current;
        if (element !== null) {
          element.focus();
          element.setSelectionRange(edit.caret, edit.caret);
        }
      });
    },
    [onChange, options, selection, textareaRef, trigger, value],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (!open || trigger === null || composingRef.current || event.nativeEvent.isComposing) {
        return false;
      }
      const count = options.length;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex(
          event.key === 'ArrowDown' ? (activeIndex + 1) % count : (activeIndex - 1 + count) % count,
        );
        return true;
      }
      const plain = !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
      if ((event.key === 'Enter' || event.key === 'Tab') && plain) {
        event.preventDefault();
        select(activeIndex);
        return true;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setDismissedStart(trigger.start);
        return true;
      }
      return false;
    },
    [activeIndex, open, options.length, select, setActiveIndex, trigger],
  );

  const onCompositionStart = useCallback((): void => {
    composingRef.current = true;
    setComposing(true);
  }, []);

  const onCompositionEnd = useCallback((): void => {
    composingRef.current = false;
    setComposing(false);
    syncCaret();
  }, [syncCaret]);

  const aria: PluginMentionComboboxAria | undefined = enabled
    ? {
        role: PluginMentionRole.COMBOBOX,
        'aria-autocomplete': 'list',
        'aria-haspopup': 'listbox',
        'aria-expanded': open,
        'aria-controls': open ? listboxId : undefined,
        'aria-activedescendant': open ? `${listboxId}-option-${String(activeIndex)}` : undefined,
      }
    : undefined;

  return {
    enabled,
    open,
    options,
    activeIndex,
    listboxId,
    aria,
    handleKeyDown,
    syncCaret,
    select,
    setActiveIndex,
    onCompositionStart,
    onCompositionEnd,
  };
}
