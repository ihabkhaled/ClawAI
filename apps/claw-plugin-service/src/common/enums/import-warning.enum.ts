/** Things the review screen must tell the user. Stable keys: the UI localizes them. */
export enum ImportWarning {
  HOOKS_NOT_RUN = 'hooks-not-run',
  STDIO_NOT_RUN = 'stdio-not-run',
  FILES_IGNORED = 'files-ignored',
  NO_MANIFEST = 'no-manifest',
  NAME_FROM_SOURCE = 'name-from-source',
  DUPLICATE_COMPONENT_NAME = 'duplicate-component-name',
  COMPONENT_LIMIT = 'component-limit',
}
