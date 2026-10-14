/**
 * Why a message that mentioned plugins ran without some or all of them. Shown
 * to the user as a notice on the answer; the message itself always goes through.
 */
export enum PluginNoticeCode {
  /** plugin-service could not be reached or answered with an error. */
  SERVICE_UNAVAILABLE = 'PLUGIN_SERVICE_UNAVAILABLE',
  /** The mentioned plugins offered no usable tool (disabled, removed, plan gate off). */
  NO_TOOLS = 'PLUGIN_NO_TOOLS',
  /** A tool needed the user's approval, which this surface cannot ask for yet. */
  CONSENT_NOT_AVAILABLE = 'PLUGIN_CONSENT_NOT_AVAILABLE',
  /** The round or call cap was reached and the model was asked to answer now. */
  LIMIT_REACHED = 'PLUGIN_LIMIT_REACHED',
  /** A mentioned own MCP server is slow, failing or its breaker is open; it was skipped. */
  SERVER_UNAVAILABLE = 'PLUGIN_SERVER_UNAVAILABLE',
  /** A mentioned own MCP server changed its tools and waits for the owner's review. */
  SERVER_NEEDS_REVIEW = 'PLUGIN_SERVER_NEEDS_REVIEW',
}
