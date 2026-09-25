/** The closest usable snapshot the availability API reported. */
export type WaybackSnapshot = {
  url: string;
  /** Wayback's `YYYYMMDDhhmmss` capture timestamp. */
  timestamp: string;
};

/** Shape of `https://archive.org/wayback/available?url=...`'s JSON response. */
export type WaybackAvailabilityResponse = {
  url?: string;
  archived_snapshots?: {
    closest?: {
      status: string;
      available: boolean;
      url: string;
      timestamp: string;
    };
  };
};
