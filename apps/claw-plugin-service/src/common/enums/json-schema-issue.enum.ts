export enum JsonSchemaIssue {
  NOT_AN_OBJECT = 'schema must be a JSON object',
  TOO_DEEP = 'schema is nested too deeply',
  TOO_LARGE = 'schema is too large',
  TOO_MANY_NODES = 'schema has too many nodes',
  FORBIDDEN_KEY = 'schema uses a forbidden key',
  FORBIDDEN_KEYWORD = 'schema uses a forbidden keyword',
  REMOTE_REF = 'schema references something other than its own document',
  NOT_SERIALISABLE = 'schema is not serialisable JSON',
  HOSTILE_TEXT = 'schema contains control or invisible characters',
}
