/** Where a window number came from: the catalog or the shared table (known), or the assumed default. */
export type ModelWindowSource = 'known' | 'assumed';

export type ModelWindow = { tokens: number; source: ModelWindowSource };

export type ModelWindowCacheEntry = { window: ModelWindow; expiresAt: number };

/** The catalog reduced to the windows it states, keyed by `PROVIDER/modelKey`. */
export type ConnectorWindowIndex = { windows: ReadonlyMap<string, number>; expiresAt: number };
