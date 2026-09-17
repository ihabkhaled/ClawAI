import { type WorkspaceProvider } from '@claw/shared-types';

import { type WorkspaceMentionRefusal } from '../enums/workspace-mention-refusal.enum';

/** A mention that resolved to something the user may actually act on. */
export type ResolvedWorkspaceMention = {
  provider: WorkspaceProvider;
  connectorId: string;
  displayName: string;
};

/**
 * A mention that did not resolve, and why.
 *
 * The reason is carried so the user can be told the truth — "GitHub is not
 * connected" and "you do not have permission on that connector" are different
 * problems with different fixes, and collapsing them into a silent no-op is how
 * a feature becomes unexplainable.
 */
export type RefusedWorkspaceMention = {
  provider: WorkspaceProvider;
  reason: WorkspaceMentionRefusal;
};

export type WorkspaceMentionResolution = {
  resolved: ResolvedWorkspaceMention[];
  refused: RefusedWorkspaceMention[];
};
