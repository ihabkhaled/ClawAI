import type { ToolUpdate } from './mcp-server.types';

/** One validated change to one tool of a server, by local name. */
export type PlannedToolUpdate = { localName: string; update: ToolUpdate };
