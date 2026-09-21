/**
 * Every place in this platform that asks a model something.
 *
 * Named because context is a per-surface decision and was, until now, a
 * per-surface *re-implementation*: three managers carried a byte-for-byte copy
 * of the same context builder, seven more built a prompt from the user's raw
 * string, and the judge deleted the conversation before reading it. A surface
 * is how the gateway knows which of those it is serving without the caller
 * re-deriving anything.
 */
export enum ChatSurface {
  /** A single-model chat turn — the shape every other surface is measured against. */
  CHAT = 'CHAT',
  COMPARE = 'COMPARE',
  CONSENSUS = 'CONSENSUS',
  ESCALATION = 'ESCALATION',
  REPAIR = 'REPAIR',
  DECOMPOSE = 'DECOMPOSE',
  BEST_OF_N = 'BEST_OF_N',
  VERIFY = 'VERIFY',
  PIPELINE = 'PIPELINE',
  COST_ENSEMBLE = 'COST_ENSEMBLE',
  ROLE_PACK = 'ROLE_PACK',
  /** The critic pass, which must see what the answer it is judging saw. */
  CRITIC = 'CRITIC',
  /** The judge pass, same requirement. */
  JUDGE = 'JUDGE',
  /** A Runtime V2 coding-agent turn. */
  AGENT = 'AGENT',
}
