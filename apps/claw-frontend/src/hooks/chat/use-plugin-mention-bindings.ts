import { useMemo } from 'react';

import type {
  PluginMentionTextareaBase,
  PluginMentionTextareaBindings,
  UsePluginMentionComboboxReturn,
} from '@/types/plugin-mention.types';

/**
 * The textarea's event props with the `@` picker folded in: the picker sees a key first and
 * the textarea's own handler runs only when the picker did not take it, so Enter still sends
 * with the picker closed. Typing, clicking and moving the caret keep the picker's caret current.
 * With no mention support every handler is the textarea's own and nothing else is added.
 */
export function usePluginMentionBindings(
  mention: UsePluginMentionComboboxReturn,
  base: PluginMentionTextareaBase,
): PluginMentionTextareaBindings {
  const { enabled, handleKeyDown, syncCaret, onCompositionStart, onCompositionEnd } = mention;
  const { onChange, onKeyDown, onCompositionStart: baseStart, onCompositionEnd: baseEnd } = base;

  return useMemo(
    () =>
      enabled
        ? {
            onChange: (event) => {
              onChange(event);
              syncCaret();
            },
            onKeyDown: (event) => {
              if (!handleKeyDown(event)) {
                onKeyDown(event);
              }
            },
            onKeyUp: syncCaret,
            onClick: syncCaret,
            onSelect: syncCaret,
            onCompositionStart: () => {
              baseStart();
              onCompositionStart();
            },
            onCompositionEnd: () => {
              baseEnd();
              onCompositionEnd();
            },
          }
        : {
            onChange,
            onKeyDown,
            onCompositionStart: baseStart,
            onCompositionEnd: baseEnd,
          },
    [
      baseEnd,
      baseStart,
      enabled,
      handleKeyDown,
      onChange,
      onCompositionEnd,
      onCompositionStart,
      onKeyDown,
      syncCaret,
    ],
  );
}
