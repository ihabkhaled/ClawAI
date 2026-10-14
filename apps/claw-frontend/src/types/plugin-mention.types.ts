import type { PluginMentionView } from '@claw/shared-types';
import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';

import type { PluginMentionRole } from '@/enums/plugin-mention-role.enum';

/** One mention chip, exactly as chat-service receives it (`pluginRefs`). */
export type PluginRefPayload = {
  installId: string;
  /** Present only when one tool was picked rather than the whole plugin. */
  toolName?: string;
  label: string;
};

/** The `@` token under the caret: where it starts and what has been typed after it. */
export type PluginMentionTrigger = {
  /** Index of the `@` in the text. */
  start: number;
  /** Caret index: the token runs from `start` to here. */
  end: number;
  query: string;
};

export type PluginMentionEdit = { value: string; caret: number };

/** Who owns the chips: the composer, which sends them with the message. */
export type UsePluginMentionSelectionParams = {
  value: string;
  onValueChange: (next: string) => void;
};

export type PluginMentionChipProps = {
  installId: string;
  label: string;
};

export type UsePluginMentionSelectionReturn = {
  refs: readonly PluginRefPayload[];
  /** The user's installed plugins; empty until `arm()` was called and the list has loaded. */
  options: readonly PluginMentionView[];
  isFull: boolean;
  /** Starts loading the list; called when the user first types an "@". */
  arm: () => void;
  /** `currentValue` is the text before the `@Name` is inserted, to drop chips already typed away. */
  add: (option: PluginMentionView, currentValue: string) => void;
  /** Removes the chip and the `@Name` it left in the text. */
  remove: (installId: string) => void;
  /** Called after a send: a mention belongs to one message. */
  clear: () => void;
  /** The `pluginRefs` request field, or an empty object when nothing is mentioned. */
  payload: { pluginRefs?: PluginRefPayload[] };
};

export type PluginMentionChipsProps = {
  refs: readonly PluginRefPayload[];
  onRemove: (installId: string) => void;
  disabled?: boolean;
};

export type UsePluginMentionComboboxParams = {
  value: string;
  onChange: (next: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  selection: UsePluginMentionSelectionReturn | undefined;
  disabled: boolean;
};

export type PluginMentionComboboxAria = {
  role: PluginMentionRole;
  'aria-autocomplete': 'list';
  'aria-haspopup': 'listbox';
  'aria-expanded': boolean;
  'aria-controls': string | undefined;
  'aria-activedescendant': string | undefined;
};

export type UsePluginMentionComboboxReturn = {
  /** False when the composer has no mention support: nothing below is used. */
  enabled: boolean;
  open: boolean;
  options: readonly PluginMentionView[];
  activeIndex: number;
  listboxId: string;
  aria: PluginMentionComboboxAria | undefined;
  /** True when the key was the picker's (arrows, Enter, Tab, Escape): the textarea must not act on it. */
  handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => boolean;
  /** Keeps the caret current: typing, clicking and arrow keys all move it. */
  syncCaret: () => void;
  select: (index: number) => void;
  setActiveIndex: (index: number) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
};

export type PluginMentionListboxProps = {
  listboxId: string;
  options: readonly PluginMentionView[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
};

/** The textarea's own handlers, which the picker wraps. */
export type PluginMentionTextareaBase = {
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
};

export type PluginMentionTextareaBindings = PluginMentionTextareaBase & {
  onKeyUp?: () => void;
  onClick?: () => void;
  onSelect?: () => void;
};

/** Which row of the picker is active, keyed to the token it was chosen for. */
export type PluginMentionActiveState = { query: string; index: number };
