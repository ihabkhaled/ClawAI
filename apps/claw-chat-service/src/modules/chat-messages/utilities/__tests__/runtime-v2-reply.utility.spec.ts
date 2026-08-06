import {
  RUNTIME_V2_BUDGET_EXHAUSTED_CODE,
  RUNTIME_V2_BUDGET_EXHAUSTED_MESSAGE,
} from '../../constants/runtime-v2-failure.constants';
import { parseRuntimeV2TaggedReply } from '../runtime-v2-reply.utility';

// The admission script already says exactly why it refused — BUDGET_EXHAUSTED,
// RUN_TERMINAL, ALREADY_CLAIMED, RECEIPT_ARGUMENT_MISMATCH — and every one of
// them was collapsed into one opaque "Runtime transition was denied". A client
// could not tell a run that had spent its tool budget from one whose claim had
// gone stale, and neither could an operator: the reason existed and was thrown
// away at the last step.
describe('parseRuntimeV2TaggedReply', () => {
  it('passes a successful reply through with its tag and body', () => {
    expect(parseRuntimeV2TaggedReply(['OK', '{"ok":true}'])).toEqual({
      tag: 'OK',
      body: '{"ok":true}',
    });
  });

  it('gives an exhausted budget its own code and an actionable message', () => {
    // This is the one denial a run can never recover from, so it has to be
    // distinguishable: the caller ends the run on it rather than retrying.
    expect(() => parseRuntimeV2TaggedReply(['DENIED', 'BUDGET_EXHAUSTED'])).toThrow(
      expect.objectContaining({
        code: RUNTIME_V2_BUDGET_EXHAUSTED_CODE,
        message: RUNTIME_V2_BUDGET_EXHAUSTED_MESSAGE,
      }),
    );
  });

  it('names the specific reason for every other denial', () => {
    for (const reason of ['RUN_TERMINAL', 'ALREADY_CLAIMED', 'RECEIPT_ARGUMENT_MISMATCH']) {
      expect(() => parseRuntimeV2TaggedReply(['DENIED', reason])).toThrow(
        expect.objectContaining({
          code: 'RUNTIME_TRANSITION_DENIED',
          message: `Runtime transition was denied: ${reason}`,
        }),
      );
    }
  });

  it('refuses to echo a denial body that is not one of our own tokens', () => {
    // The reason is a fixed vocabulary emitted by our scripts. Anything else is
    // unexpected input and must not be reflected into the message.
    expect(() => parseRuntimeV2TaggedReply(['DENIED', 'user@example.com /secret/path'])).toThrow(
      expect.objectContaining({ message: 'Runtime transition was denied: UNKNOWN' }),
    );
  });

  it('maps the remaining tags to their own errors', () => {
    expect(() => parseRuntimeV2TaggedReply(['MISSING', ''])).toThrow(
      expect.objectContaining({ code: 'RUNTIME_RUN_NOT_FOUND' }),
    );
    expect(() => parseRuntimeV2TaggedReply(['CONFLICT', ''])).toThrow(
      expect.objectContaining({ code: 'RUNTIME_REPLAY_CONFLICT' }),
    );
  });

  it('reports an unparsable reply as unavailable state, not a denial', () => {
    expect(() => parseRuntimeV2TaggedReply('not-a-tuple')).toThrow(
      expect.objectContaining({ code: 'RUNTIME_STATE_UNAVAILABLE' }),
    );
  });
});
