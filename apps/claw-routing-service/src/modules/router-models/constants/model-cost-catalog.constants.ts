/**
 * How many registry rows are priced at once.
 *
 * The catalogue resolves every model through `ModelCostService.getSnapshot`,
 * which costs one to three queries each. Firing all ~166 at once would ask for
 * several hundred connections from a pool sized to the CPU count and risk a
 * pool timeout on the admin's first page load; resolving them one at a time
 * turns a sub-second page into a serial round-trip per model. A small batch is
 * the middle: bounded pressure, still concurrent.
 */
export const MODEL_COST_CATALOG_BATCH_SIZE = 16;
