/** The syntactic reason a URL was refused before any DNS lookup. Logged and audited, never shown to a user. */
export enum EgressBlockReason {
  TOO_LONG = 'TOO_LONG',
  CONTROL_CHARACTERS = 'CONTROL_CHARACTERS',
  UNPARSEABLE = 'UNPARSEABLE',
  SCHEME = 'SCHEME',
  USERINFO = 'USERINFO',
  FRAGMENT = 'FRAGMENT',
  PORT = 'PORT',
  IP_LITERAL = 'IP_LITERAL',
  LOCAL_NAME = 'LOCAL_NAME',
  SINGLE_LABEL = 'SINGLE_LABEL',
  NUMERIC_TLD = 'NUMERIC_TLD',
}
