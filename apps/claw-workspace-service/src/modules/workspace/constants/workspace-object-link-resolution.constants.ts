import { WorkspaceObjectLinkType } from '../../../common/enums/workspace-object-link-type.enum';

// Phase 10 — link types resolved by matching a newly-synced object's `url`
// against an existing link's externalRef (both GitHub reference kinds
// store the full html_url in externalRef).
export const GITHUB_REFERENCE_LINK_TYPES: string[] = [
  WorkspaceObjectLinkType.GITHUB_PR_REFERENCE,
  WorkspaceObjectLinkType.GITHUB_ISSUE_REFERENCE,
];
