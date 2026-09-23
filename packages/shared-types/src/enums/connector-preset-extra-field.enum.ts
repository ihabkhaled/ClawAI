/**
 * A connector field a preset needs beyond the API key and base URL.
 *
 * ACCOUNT_ID is Cloudflare's 32-character hex account id. It is substituted
 * into the `{ACCOUNT_ID}` placeholder of the preset's base and models URLs and
 * stored in the connector's own `account_id` column.
 */
export enum ConnectorPresetExtraField {
  ACCOUNT_ID = 'ACCOUNT_ID',
}
