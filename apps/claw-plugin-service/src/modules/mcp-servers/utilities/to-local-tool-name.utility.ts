import { LOCAL_TOOL_NAME_MAX } from '../constants/mcp.constants';

/**
 * The model-facing name of a server's tool: lower case, [a-z0-9_] only, no leading, trailing or
 * repeated underscores, at most 40 characters (so plugin_<slug>_<tool> fits 64). Null when
 * nothing usable is left. Two different server names can fold to the same local name; the
 * caller keeps the first and skips the rest.
 */
export function toLocalToolName(remoteName: string): string | null {
  const folded = remoteName
    .toLowerCase()
    .replaceAll(/[^a-z0-9_]/g, '_')
    .replaceAll(/_+/g, '_')
    .slice(0, LOCAL_TOOL_NAME_MAX)
    .replaceAll(/^_+|_+$/g, '');
  return folded === '' ? null : folded;
}
