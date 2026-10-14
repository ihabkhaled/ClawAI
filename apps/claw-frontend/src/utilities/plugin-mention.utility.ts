import type { PluginMentionView } from '@claw/shared-types';

import {
  PLUGIN_MENTION_LABEL_MAX,
  PLUGIN_MENTION_MAX_OPTIONS,
  PLUGIN_MENTION_TRIGGER,
} from '@/constants/plugin-mention.constants';
import type {
  PluginMentionEdit,
  PluginMentionTrigger,
  PluginRefPayload,
} from '@/types/plugin-mention.types';

const WHITESPACE = /\s/u;

/**
 * The `@` token the caret is in, or null.
 *
 * The `@` must start the text or follow whitespace, so an email address or a handle
 * (`name@host`) never opens the picker. The token runs from the `@` to the caret and holds no
 * whitespace: typing a space ends it.
 */
export function findMentionTrigger(value: string, caret: number): PluginMentionTrigger | null {
  const end = Math.min(Math.max(caret, 0), value.length);
  for (let index = end - 1; index >= 0; index -= 1) {
    const character = value.charAt(index);
    if (WHITESPACE.test(character)) {
      return null;
    }
    if (character === PLUGIN_MENTION_TRIGGER) {
      const before = index === 0 ? '' : value.charAt(index - 1);
      return before === '' || WHITESPACE.test(before)
        ? { start: index, end, query: value.slice(index + 1, end) }
        : null;
    }
  }
  return null;
}

/** Plugins matching what was typed: enabled only, not already chosen, names that start with it first. */
export function filterMentionOptions(
  options: readonly PluginMentionView[],
  query: string,
  chosenInstallIds: ReadonlySet<string>,
): PluginMentionView[] {
  const needle = query.trim().toLocaleLowerCase();
  const available = options.filter(
    (option) => option.enabled && !chosenInstallIds.has(option.installId),
  );
  const rank = (option: PluginMentionView): number => {
    const name = option.name.toLocaleLowerCase();
    const slug = option.slug.toLocaleLowerCase();
    if (needle === '') {
      return 0;
    }
    if (name.startsWith(needle) || slug.startsWith(needle)) {
      return 0;
    }
    return name.includes(needle) || slug.includes(needle) ? 1 : 2;
  };
  return available
    .map((option) => ({ option, rank: rank(option) }))
    .filter((entry) => entry.rank < 2)
    .toSorted((left, right) => left.rank - right.rank)
    .slice(0, PLUGIN_MENTION_MAX_OPTIONS)
    .map((entry) => entry.option);
}

/** What the chip says, and what `@Name` reads as in the text. Bounded to what the server accepts. */
export function mentionLabel(option: PluginMentionView): string {
  return option.name.trim().slice(0, PLUGIN_MENTION_LABEL_MAX);
}

/** The text token for a chip. */
export function mentionToken(label: string): string {
  return `${PLUGIN_MENTION_TRIGGER}${label}`;
}

/** Replaces the typed `@query` with `@Name ` and puts the caret after the space. */
export function applyMention(
  value: string,
  trigger: PluginMentionTrigger,
  label: string,
): PluginMentionEdit {
  const inserted = `${mentionToken(label)} `;
  const next = value.slice(0, trigger.start) + inserted + value.slice(trigger.end);
  return { value: next, caret: trigger.start + inserted.length };
}

/**
 * Chips whose `@Name` is still in the text. Matching is by label, never by offsets, so an edit
 * earlier in the message cannot orphan or misplace a chip.
 */
export function reconcileRefs(
  refs: readonly PluginRefPayload[],
  value: string,
): readonly PluginRefPayload[] {
  const kept = refs.filter((ref) => value.includes(mentionToken(ref.label)));
  return kept.length === refs.length ? refs : kept;
}

/** Removes the first `@Name` (and the one space after it) from the text. */
export function removeMentionToken(value: string, label: string): string {
  const token = mentionToken(label);
  const at = value.indexOf(token);
  if (at === -1) {
    return value;
  }
  const after = value.charAt(at + token.length) === ' ' ? 1 : 0;
  return value.slice(0, at) + value.slice(at + token.length + after);
}
