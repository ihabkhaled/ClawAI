import type { ToolSkipReason } from '../../../common/enums/tool-skip-reason.enum';

/** A tool the server listed, vetted: safe text, a schema inside the accepted subset, a stable hash. */
export type SnapshotTool = {
  /** The name as the server knows it; what tools/call is sent. */
  name: string;
  /** [a-z0-9_]{1,40}, unique within the server; what the model sees after plugin_<slug>_. */
  localName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  schemaHash: string;
};

export type SkippedTool = { name: string; reason: ToolSkipReason };

export type ToolSnapshot = {
  tools: SnapshotTool[];
  skipped: SkippedTool[];
  /** Tools beyond the per-server limit; they are dropped, and counted so the user can be told. */
  ignored: number;
  /** Hash of the whole approved list; a different value at refresh means NEEDS_REVIEW. */
  toolsHash: string;
};

export type ToolDiff = { added: string[]; removed: string[]; changed: string[] };

/** The part of a stored tool the diff needs. */
export type StoredToolIdentity = { name: string; localName: string; schemaHash: string };

/** A snapshot together with what the server said about itself in initialize. */
export type DiscoveredSnapshot = ToolSnapshot & { serverInfo: Record<string, string> | null };
