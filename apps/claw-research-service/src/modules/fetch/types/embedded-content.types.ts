import type { EmbeddedStateSource } from '../enums/embedded-state-source.enum';

/** One `<script>` element: its raw attribute string and its body. */
export type ScriptBlock = {
  attributes: string;
  body: string;
};

/** A parsed piece of script-shipped page data and where it came from. */
export type EmbeddedStateValue = {
  source: EmbeddedStateSource;
  value: unknown;
};

/** Readable text recovered from a page's embedded data. */
export type EmbeddedStateText = {
  text: string;
  sources: EmbeddedStateSource[];
};

/** Mutable walk state for `harvestProse`. */
export type ProseHarvestState = {
  parts: string[];
  seen: Set<string>;
  visited: WeakSet<object>;
  chars: number;
  nodes: number;
  maxChars: number;
};

/** What a site adapter returns: the page's real title and text. */
export type SiteAdapterText = {
  title: string | null;
  text: string;
};

/**
 * A small, data-driven reader for one family of public pages that ship their
 * content as structured data. Registered in `SITE_ADAPTERS`; reads only the
 * HTML the fetch chain already obtained — it never makes a request itself.
 */
export type SiteAdapter = {
  /** Stable name; leaves the service as provenance (`siteAdapter`). */
  name: string;
  matches: (url: URL) => boolean;
  extract: (html: string, url: URL) => SiteAdapterText | null;
};

/** A site adapter's result plus the adapter's name. */
export type SiteAdapterMatch = SiteAdapterText & { adapter: string };

/** One user/assistant turn of a shared AI conversation. */
export type ConversationTurn = {
  role: string;
  text: string;
};
