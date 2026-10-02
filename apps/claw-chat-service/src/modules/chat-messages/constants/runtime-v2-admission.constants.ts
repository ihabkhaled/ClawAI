/**
 * Stable `code` values for Runtime V2 start-request rejections the client can
 * fix and switch on. They travel as `params.code` on the zod issue; the
 * validation pipe lifts the first one onto the 400 body's `code` field.
 */
export const RUNTIME_V2_TOOL_NAME_COLLISION_CODE = 'RUNTIME_TOOL_NAME_COLLISION';
export const RUNTIME_V2_TOOL_RISK_CLASS_UNKNOWN_CODE = 'RUNTIME_TOOL_RISK_CLASS_UNKNOWN';
export const RUNTIME_V2_TOOL_DUPLICATE_IDENTITY_CODE = 'RUNTIME_TOOL_DUPLICATE_IDENTITY';
export const RUNTIME_V2_TOOL_CATALOG_TOO_LARGE_CODE = 'RUNTIME_TOOL_CATALOG_TOO_LARGE';
export const RUNTIME_V2_CATALOG_HASH_MISMATCH_CODE = 'RUNTIME_TOOL_CATALOG_HASH_MISMATCH';
export const RUNTIME_V2_CATALOG_HASH_MISMATCH_MESSAGE =
  'toolCatalogHash must be the sha256 of JSON.stringify(toolDefinitions) over the exact definitions sent, ' +
  'in the order and key order sent (descriptions are hashed untrimmed).';
