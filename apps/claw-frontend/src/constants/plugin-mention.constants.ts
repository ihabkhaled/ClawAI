import type { PluginMentionView } from '@claw/shared-types';

/** Most plugins one message may mention; the chat-service DTO refuses more (`pluginRefs`). */
export const PLUGIN_MENTION_MAX = 5;

/** Longest label chat-service accepts on a mention chip. */
export const PLUGIN_MENTION_LABEL_MAX = 80;

/** Rows the picker shows at once; the rest are reached by typing. */
export const PLUGIN_MENTION_MAX_OPTIONS = 8;

/** The list rarely changes: a minute of cache keeps `@` instant without polling. */
export const PLUGIN_MENTION_STALE_MS = 60_000;

/** The character that opens the picker. */
export const PLUGIN_MENTION_TRIGGER = '@';

/** Ids are `${instance}-plugin-mentions`; one picker is open per composer at a time. */
export const PLUGIN_MENTION_LISTBOX_SUFFIX = 'plugin-mentions';

/** Nothing to offer: the list before it has loaded, or on a composer without the picker. */
export const PLUGIN_MENTION_NO_OPTIONS: readonly PluginMentionView[] = [];

/** Stands in for a prompt setter on a page that opted out of the picker. */
export const NOOP_VALUE_CHANGE = (): void => undefined;
