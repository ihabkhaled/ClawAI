/** What a reader may see about reach: two counts, never who. */
export type PublicationViewCounts = {
  viewCount: number;
  readerCount: number;
};

/** The request facts a view needs. The address is hashed before it goes anywhere. */
export type PublicationViewRequest = {
  ip: string;
  userAgent: string | undefined;
  userId: string | null;
};
