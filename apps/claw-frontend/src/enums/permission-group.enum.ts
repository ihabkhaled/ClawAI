// Grouping buckets for the role permission grant matrix. Permissions are
// bucketed by their leading prefix; anything not matching a known prefix lands
// in OTHER.
export enum PermissionGroupKey {
  CHAT = 'CHAT',
  MEMORY = 'MEMORY',
  CONTEXT_PACK = 'CONTEXT_PACK',
  WORKSPACE = 'WORKSPACE',
  AGENT = 'AGENT',
  RESEARCH = 'RESEARCH',
  ROUTING = 'ROUTING',
  MODELS = 'MODELS',
  ADMIN = 'ADMIN',
  OTHER = 'OTHER',
}
