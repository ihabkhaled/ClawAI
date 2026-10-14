import { z } from 'zod';

import {
  PLUGIN_REF_LABEL_MAX,
  PLUGIN_REF_TOOL_NAME_MAX,
  PLUGIN_REFS_MAX,
} from '../constants/plugin-tools.constants';

/** One `@mention` chip the composer sent: which install, optionally which tool, and its label. */
export const pluginRefSchema = z.object({
  installId: z.string().uuid(),
  toolName: z.string().min(1).max(PLUGIN_REF_TOOL_NAME_MAX).optional(),
  label: z.string().min(1).max(PLUGIN_REF_LABEL_MAX),
});

/**
 * Plugin mentions, spread by every chat request DTO (normal chat, Compare, Consensus,
 * Escalation and the seven labs) next to `researchFields` and `attachmentFields`
 * (rule 59). The text is not parsed for mentions: the chips are the contract.
 * chat-service never trusts an id here; plugin-service re-checks ownership.
 */
export const pluginFields = {
  pluginRefs: z
    .array(pluginRefSchema)
    .max(PLUGIN_REFS_MAX, `At most ${String(PLUGIN_REFS_MAX)} plugins per message`)
    .optional(),
};
