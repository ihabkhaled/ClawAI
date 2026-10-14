/** What ClawAI does with a component today. Nothing here ever executes imported code. */
export enum ImportSupport {
  /** Usable now (a remote MCP server the user can register). */
  USABLE = 'USABLE',
  /** Kept as an inert document; nothing in chat reads it yet. */
  STORED_INERT = 'STORED_INERT',
  /** Not supported on the web; never run, never stored as runnable. */
  NOT_SUPPORTED = 'NOT_SUPPORTED',
}
