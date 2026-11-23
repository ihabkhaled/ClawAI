import type { Readable } from 'node:stream';

/** One proxied HLS response: a rewritten playlist or a passed-through segment. */
export interface HlsProxyReply {
  contentType: string;
  body: Readable;
}

/** A bounded fetch of one origin object. */
export interface HlsFetchedObject {
  contentType: string;
  body: Buffer;
  /** Final URL (equal to the request: redirects are refused). */
  url: URL;
}

export interface PlaylistRewriteResult {
  text: string;
  /** URIs that pointed at another host; a non-zero count refuses the playlist. */
  rejected: number;
}

/** One declared host (HLS sources), or host suffixes of a server-pulled platform's CDN. */
export type HlsHostPin = string | readonly string[];
