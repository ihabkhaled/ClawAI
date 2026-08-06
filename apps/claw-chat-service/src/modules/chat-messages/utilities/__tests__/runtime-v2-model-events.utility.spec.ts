import {
  RUNTIME_V2_EMPTY_SUMMARY,
  RUNTIME_V2_MODEL_SUMMARY_CHARACTERS,
  RUNTIME_V2_MODEL_TURN_BYTES,
  RUNTIME_V2_TRUNCATION_NOTICE,
} from '../../constants/runtime-v2-model-events.constants';
import { buildRuntimeV2ModelEvents } from '../runtime-v2-model-events.utility';

// The defect these cover reached users as "the agent does nothing".
//
// Runtime V2 streamed lifecycle and tool events only, so the client saw a run
// start, dispatch, call tools and complete — while the assistant's answer went
// to the database and nowhere else. The protocol already defined
// model.turn.started / model.delta / model.summary and clients already
// projected them; the server simply never emitted any of them.

describe('buildRuntimeV2ModelEvents', () => {
  it('opens the turn, sends the text, then closes the turn', () => {
    const events = buildRuntimeV2ModelEvents('turn_0000001', 'Hello there.');

    expect(events.map((event) => event.type)).toEqual([
      'model.turn.started',
      'model.delta',
      'model.summary',
    ]);
  });

  it('carries the answer verbatim on the delta', () => {
    const text = 'Here is the loop:\n\n```ts\nfor (const x of xs) {}\n```';
    const events = buildRuntimeV2ModelEvents('turn_0000001', text);
    const deltas = events.filter((event) => event.type === 'model.delta');

    expect(deltas.map((event) => event.payload).map((p) => ('text' in p ? p.text : ''))).toEqual([
      text,
    ]);
  });

  it('tags every event with the same turn id', () => {
    const events = buildRuntimeV2ModelEvents('turn_0000001', 'text');

    for (const event of events) expect(event.payload.turnId).toBe('turn_0000001');
  });

  it('truncates an over-long answer instead of streaming a rejected second delta', () => {
    // This previously emitted three chunked deltas. It looked contract-safe but
    // was not deliverable: a client caps the turn's CUMULATIVE text at the same
    // 64 KiB, so delta two always pushed the total over and was rejected, and
    // the run died mid-answer. A 113 KB reply reproduced it against the live
    // stack. One bounded delta plus a visible notice is what a client accepts.
    const text = 'x'.repeat(RUNTIME_V2_MODEL_TURN_BYTES * 2 + 10);
    const deltas = buildRuntimeV2ModelEvents('turn_0000001', text).filter(
      (event) => event.type === 'model.delta',
    );

    expect(deltas).toHaveLength(1);
    const payload = deltas[0]?.payload;
    const delivered = payload !== undefined && 'text' in payload ? payload.text : '';
    expect(new TextEncoder().encode(delivered).byteLength).toBeLessThanOrEqual(
      RUNTIME_V2_MODEL_TURN_BYTES,
    );
    expect(delivered.endsWith(RUNTIME_V2_TRUNCATION_NOTICE)).toBe(true);
  });

  it('measures the cap in UTF-8 bytes, not characters', () => {
    // The client measures TextEncoder().encode().byteLength while String.length
    // counts UTF-16 units. Bounding by characters let a non-ASCII answer sit
    // under the character cap and still blow the byte cap, so an answer in any
    // multi-byte script was rejected where the same length of ASCII passed.
    const text = '你'.repeat(RUNTIME_V2_MODEL_TURN_BYTES); // 3 bytes per character
    const delta = buildRuntimeV2ModelEvents('turn_0000001', text).find(
      (event) => event.type === 'model.delta',
    );

    const payload = delta?.payload;
    const delivered = payload !== undefined && 'text' in payload ? payload.text : '';
    expect(new TextEncoder().encode(delivered).byteLength).toBeLessThanOrEqual(
      RUNTIME_V2_MODEL_TURN_BYTES,
    );
    // A multi-byte character must never be split across the boundary.
    expect(delivered.includes('�')).toBe(false);
  });

  it('leaves an answer that already fits completely untouched', () => {
    const text = 'z'.repeat(RUNTIME_V2_MODEL_TURN_BYTES);
    const delta = buildRuntimeV2ModelEvents('turn_0000001', text).find(
      (event) => event.type === 'model.delta',
    );

    const payload = delta?.payload;
    expect(payload !== undefined && 'text' in payload ? payload.text : '').toBe(text);
  });

  it('emits no delta for an empty answer but still closes the turn', () => {
    // A turn that is never summarised stays open in the client's projection.
    const events = buildRuntimeV2ModelEvents('turn_0000001', '');

    expect(events.map((event) => event.type)).toEqual(['model.turn.started', 'model.summary']);
    const summary = events.at(-1)?.payload;
    expect(summary !== undefined && 'summary' in summary ? summary.summary : '').toBe(
      RUNTIME_V2_EMPTY_SUMMARY,
    );
  });

  it('summarises with the first non-empty line, never an empty string', () => {
    // The summary schema requires a non-empty trimmed string, so a leading
    // blank line must not become the summary.
    const events = buildRuntimeV2ModelEvents('turn_0000001', '\n\n  Real first line\nsecond');
    const summary = events.at(-1)?.payload;

    expect(summary !== undefined && 'summary' in summary ? summary.summary : '').toBe(
      'Real first line',
    );
  });

  it('bounds the summary to what the schema accepts', () => {
    const events = buildRuntimeV2ModelEvents('turn_0000001', 'y'.repeat(10_000));
    const payload = events.at(-1)?.payload;
    const summary = payload !== undefined && 'summary' in payload ? payload.summary : '';

    expect(summary.length).toBe(RUNTIME_V2_MODEL_SUMMARY_CHARACTERS);
    expect(summary.trim().length).toBeGreaterThan(0);
  });
});
