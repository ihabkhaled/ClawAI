// F028 — deferred tool loading (ToolSearch) for Runtime V2.
//
// A run's catalog is fixed and hashed at start. Deferred tools keep that
// guarantee: each is declared at start as a stub carrying a hash commitment to
// its full definition, and a mid-run load is accepted only when the submitted
// definition hashes to that commitment. Nothing undeclared is ever admitted.

/** The most definitions one load request may carry. */
export const RUNTIME_V2_DEFERRED_LOAD_MAX_DEFINITIONS = 16;

/** Suffix of the per-run Redis hash that holds loaded definitions. */
export const RUNTIME_V2_LOADED_TOOLS_KEY_SUFFIX = 'loaded-tools';

/** The start catalog is version 1; each loaded definition adds one. */
export const RUNTIME_V2_START_CATALOG_VERSION = 1;

/** The client tool a model calls to load a deferred schema. */
export const RUNTIME_V2_TOOL_SEARCH_NAME = 'runtime.tool_search';

export const RUNTIME_V2_TOOL_NOT_DEFERRED_CODE = 'RUNTIME_TOOL_NOT_DEFERRED';
export const RUNTIME_V2_DEFERRED_TOOL_MISMATCH_CODE = 'RUNTIME_DEFERRED_TOOL_MISMATCH';

// Writes every loaded definition in one step and returns the whole hash, so the
// reply is the catalog as it now stands rather than what this caller sent.
// ARGV: field, value, field, value, ..., ttlMilliseconds.
export const RUNTIME_V2_LOAD_TOOLS_SCRIPT = `-- runtime-v2:load-tools
for index = 1, #ARGV - 1, 2 do
  redis.call('HSET', KEYS[1], ARGV[index], ARGV[index + 1])
end
redis.call('PEXPIRE', KEYS[1], ARGV[#ARGV])
return redis.call('HGETALL', KEYS[1])
`;

export const RUNTIME_V2_READ_LOADED_TOOLS_SCRIPT = `-- runtime-v2:read-loaded-tools
return redis.call('HGETALL', KEYS[1])
`;

export const RUNTIME_V2_DEFERRED_INSTRUCTION =
  'Entries marked "deferred": true list only a name and a short description; their input ' +
  'schema is not loaded. Before calling one, call runtime.tool_search (operation "search") ' +
  'with the tool name or a keyword as "query". Its full schema joins this catalog on your ' +
  'next turn.';
