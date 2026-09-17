import { WorkspaceProvider } from '@claw/shared-types';

import { WORKSPACE_MENTION_PATTERN } from '../constants/workspace-mention.constants';

/**
 * The `@github` style mentions in a chat message.
 *
 * Returns provider values, de-duplicated, in the order they appear. Matching is
 * case-insensitive and anchored to a word boundary so an email address
 * (`ops@github.example`) and a code snippet do not read as a mention.
 *
 * Parsing is deliberately separate from authorisation. This says what the user
 * TYPED; whether that connector exists, is connected, and is permitted is
 * decided against the database — never from the text. A mention is a request,
 * not a grant.
 */
export function parseWorkspaceMentions(message: string): WorkspaceProvider[] {
  const found: WorkspaceProvider[] = [];
  const seen = new Set<string>();
  for (const match of message.matchAll(WORKSPACE_MENTION_PATTERN)) {
    const token = match[1]?.toUpperCase().replaceAll('-', '_');
    if (token === undefined || seen.has(token)) {
      continue;
    }
    if (isWorkspaceProvider(token)) {
      seen.add(token);
      found.push(token);
    }
  }
  return found;
}

function isWorkspaceProvider(value: string): value is WorkspaceProvider {
  return Object.values(WorkspaceProvider).includes(value as WorkspaceProvider);
}
