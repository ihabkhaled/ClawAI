/** One attribute on an untrusted fence's opening tag; the value is already sanitised by the caller. */
export type UntrustedFenceAttribute = readonly [name: string, value: string];

/** A fence around content the platform did not write: `<tag a="…" trust="untrusted">\nbody\n</tag>`. */
export type UntrustedFenceInput = {
  tag: string;
  attributes: readonly UntrustedFenceAttribute[];
  /** Already sanitised and defanged: nothing inside can close the fence. */
  body: string;
};

/** One web source as a model is shown it: numbered as `[n]` is cited, its URL, its title and its text. */
export type WebSourceFenceInput = {
  /** The citation number; the model cites the source as `[n]`. */
  n: number;
  url: string;
  title?: string | null;
  /** The page text or search snippet. */
  text: string;
  /** Extra lines inside the fence after the title (published date, which providers found it). */
  details?: readonly string[];
  /** Cap on the text, applied after sanitising; uncapped when absent. */
  maxTextChars?: number;
};

/** One search hit for a `web_search` tool result. */
export type WebSearchToolHit = {
  title: string | null;
  url: string;
  content: string;
  foundBy?: readonly string[];
};

/** A `web_search` tool result before fencing: the hits and which providers searched. */
export type WebSearchToolResultInput = {
  hits: readonly WebSearchToolHit[];
  providers?: readonly string[];
  mode?: string;
};

/** A `web_fetch` (or `get_crawled_page`) tool result before fencing: one page. */
export type WebPageToolResultInput = {
  url: string;
  title: string | null;
  content: string;
  links?: readonly string[];
  /** Set when an archive served the page: the copy is labelled as one (rule 50 §3). */
  archivedAt?: string;
};
