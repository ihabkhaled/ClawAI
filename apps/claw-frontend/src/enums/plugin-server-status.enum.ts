/** Where one of the user's own MCP servers stands. Mirrors the plugin service's ServerStatus. */
export enum PluginServerStatus {
  Approved = 'APPROVED',
  PendingApproval = 'PENDING_APPROVAL',
  Rejected = 'REJECTED',
  Disabled = 'DISABLED',
  NeedsReview = 'NEEDS_REVIEW',
  Unreachable = 'UNREACHABLE',
}
