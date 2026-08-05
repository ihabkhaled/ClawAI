import { HttpStatus } from '@nestjs/common';

import { BusinessException } from '../../../../common/errors';
import { RUNTIME_V2_FAILURE_MESSAGE_CHARACTERS } from '../../constants/runtime-v2-failure.constants';
import { runtimeV2StreamErrorEvent, runtimeV2TerminalReason } from '../runtime-v2-failure.utility';

// Two failure paths that told the user nothing.
//
// `run.failed` terminalized with an empty payload, so a dead run showed as dead
// with no reason. And an errored SSE observable is serialized by Nest as the
// raw error message on the data line, so the client got `data: Runtime state is
// unavailable` — not JSON. Every consumer parses that line as JSON, so the real
// error was replaced by a parse failure and reached the extension as "stream
// returned an invalid event".

describe('runtimeV2TerminalReason', () => {
  it('keeps the code of a BusinessException so the client can branch on it', () => {
    const reason = runtimeV2TerminalReason(
      new BusinessException(
        'Runtime token quota is exhausted',
        'RUNTIME_QUOTA_EXCEEDED',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );

    expect(reason).toEqual({
      code: 'RUNTIME_QUOTA_EXCEEDED',
      message: 'Runtime token quota is exhausted',
    });
  });

  it('falls back to a generic code for a plain Error but keeps the message', () => {
    // This is the shape the live lab hit: a provider error whose message was
    // the only clue, and which the empty payload threw away.
    const reason = runtimeV2TerminalReason(new Error("model 'qwen3:14b' not found"));

    expect(reason).toEqual({
      code: 'RUNTIME_RUN_FAILED',
      message: "model 'qwen3:14b' not found",
    });
  });

  it('handles a thrown non-Error without losing it', () => {
    expect(runtimeV2TerminalReason('something odd')).toEqual({
      code: 'RUNTIME_RUN_FAILED',
      message: 'something odd',
    });
  });

  it('bounds the message, because it rides on a size-capped event payload', () => {
    const reason = runtimeV2TerminalReason(new Error('x'.repeat(5_000)));

    expect(reason.message.length).toBe(RUNTIME_V2_FAILURE_MESSAGE_CHARACTERS);
    expect(reason.message.endsWith('…')).toBe(true);
  });

  it('collapses whitespace so a multi-line stack-ish message stays one line', () => {
    const reason = runtimeV2TerminalReason(new Error('failed\n  at somewhere\n  at elsewhere'));

    expect(reason.message).toBe('failed at somewhere at elsewhere');
  });

  it('never leaves the message empty', () => {
    expect(runtimeV2TerminalReason(new Error('   ')).message).toBe(
      'Runtime run failed without a message',
    );
  });
});

describe('runtimeV2StreamErrorEvent', () => {
  it('produces a JSON-serializable object, not a bare string', () => {
    // The whole point: whatever goes on the data line must survive JSON.parse
    // on the client, or the real error is replaced by a parse error.
    const event = runtimeV2StreamErrorEvent(
      new BusinessException(
        'Runtime state is unavailable',
        'RUNTIME_STATE_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
      ),
    );
    const roundTripped: unknown = JSON.parse(JSON.stringify(event));

    expect(typeof roundTripped).toBe('object');
    expect(Array.isArray(roundTripped)).toBe(false);
    expect(roundTripped).toMatchObject({
      type: 'stream.error',
      code: 'RUNTIME_STATE_UNAVAILABLE',
      message: 'Runtime state is unavailable',
    });
  });

  it('carries a timestamp so the client can order it against other events', () => {
    const event = runtimeV2StreamErrorEvent(new Error('boom'));

    expect(Number.isNaN(Date.parse(String(event['timestamp'])))).toBe(false);
  });
});
