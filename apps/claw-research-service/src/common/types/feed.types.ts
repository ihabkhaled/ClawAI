export type FeedEntry = {
  title: string | null;
  url: string;
  publishedAt: string | null;
};

export type FeedParseResult =
  | { kind: 'rss'; entries: FeedEntry[] }
  | { kind: 'atom'; entries: FeedEntry[] }
  | { kind: 'unrecognized' };
