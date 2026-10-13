/** How one model candidate of a role finally failed: machine code only, never provider text. */
export type CandidateOutcome = {
  provider: string;
  model: string;
  code: string;
  httpStatus: number | null;
};

/** What trying one candidate produced: an accepted reply, or the failure that moves on to the next. */
export type CandidateAttempt<Response> =
  { response: Response } | { failure: CandidateOutcome; error: unknown; deterministic: boolean };
