/**
 * The JSON shape a preset's key-credit endpoints answer with.
 *
 * OPENROUTER reads two shapes: `GET /key` → `{ data: { limit_remaining } }`
 * (USD left on this key's limit; `null` = the key has no limit) and
 * `GET /credits` → `{ data: { total_credits, total_usage } }` (the account's
 * prepaid balance). The smaller known balance wins.
 */
export enum ConnectorCreditHeadroomFormat {
  OPENROUTER = 'OPENROUTER',
}
