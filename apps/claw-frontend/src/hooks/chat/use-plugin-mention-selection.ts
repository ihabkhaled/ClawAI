import type { PluginMentionView } from '@claw/shared-types';
import { useCallback, useMemo, useState } from 'react';

import { PLUGIN_MENTION_MAX } from '@/constants/plugin-mention.constants';
import { usePluginMentionOptions } from '@/hooks/chat/use-plugin-mention-options';
import type {
  PluginRefPayload,
  UsePluginMentionSelectionParams,
  UsePluginMentionSelectionReturn,
} from '@/types/plugin-mention.types';
import {
  mentionLabel,
  reconcileRefs,
  removeMentionToken,
} from '@/utilities/plugin-mention.utility';

/**
 * The chips of one composer: which plugins this message mentions.
 *
 * The text keeps `@Name`; the chips are what gets sent. A chip whose `@Name` the user edited out
 * of the text is dropped, matched by label rather than by offsets, so an edit earlier in the
 * message cannot misplace one. Capped at the number chat-service accepts.
 *
 * Every composer that renders RichPromptTextarea with `pluginMentions` calls this once and spreads
 * `payload` into its request, so a mention reaches Compare, the labs and normal chat the same way.
 */
export function usePluginMentionSelection({
  value,
  onValueChange,
}: UsePluginMentionSelectionParams): UsePluginMentionSelectionReturn {
  const [chosen, setChosen] = useState<readonly PluginRefPayload[]>([]);
  // The installed plugins are fetched the first time the user types an "@", not on page load.
  const [armed, setArmed] = useState(false);
  const options = usePluginMentionOptions(armed);
  // Derived, not synced in an effect: the chips are always exactly those still in the text.
  const refs = useMemo(() => reconcileRefs(chosen, value), [chosen, value]);

  const add = useCallback((option: PluginMentionView, currentValue: string): void => {
    setChosen((stored) => {
      // Chips the user typed away do not count against the cap.
      const current = reconcileRefs(stored, currentValue);
      return current.length >= PLUGIN_MENTION_MAX ||
        current.some((ref) => ref.installId === option.installId)
        ? current
        : [...current, { installId: option.installId, label: mentionLabel(option) }];
    });
  }, []);

  const remove = useCallback(
    (installId: string): void => {
      const ref = refs.find((candidate) => candidate.installId === installId);
      if (ref !== undefined) {
        onValueChange(removeMentionToken(value, ref.label));
      }
      setChosen((current) => current.filter((candidate) => candidate.installId !== installId));
    },
    [onValueChange, refs, value],
  );

  const arm = useCallback((): void => {
    setArmed(true);
  }, []);

  const clear = useCallback((): void => {
    setChosen([]);
  }, []);

  const payload = useMemo(() => (refs.length === 0 ? {} : { pluginRefs: [...refs] }), [refs]);

  return {
    refs,
    options,
    isFull: refs.length >= PLUGIN_MENTION_MAX,
    arm,
    add,
    remove,
    clear,
    payload,
  };
}
