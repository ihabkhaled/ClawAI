/** Outcome of a bounded prefix delete: `complete` is false when the scan hit its bound. */
export type PrefixDeleteResult = { removed: number; complete: boolean };
