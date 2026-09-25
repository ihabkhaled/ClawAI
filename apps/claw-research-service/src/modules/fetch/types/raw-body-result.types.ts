/** What an HTTP strategy has in hand after reading a body, before extraction. */
export type RawBodyInput = {
  url: string;
  finalUrl: string;
  httpStatus: number;
  mimeType: string | null;
  body: string;
  byteSize: number;
  startedAt: number;
};
