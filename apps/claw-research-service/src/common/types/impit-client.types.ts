/** One non-redirect-following exchange made by `ImpersonatingHttpClient`. */
export type ImpersonatedExchange = {
  status: number;
  location: string | null;
  contentType: string | null;
  body: ReadableStream<Uint8Array> | null;
  /** Decodes body bytes using the response's declared or sniffed charset. */
  decode: (bytes: Buffer) => string;
};
