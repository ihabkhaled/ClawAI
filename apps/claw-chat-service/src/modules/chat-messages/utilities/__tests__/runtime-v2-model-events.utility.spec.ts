import {
  RUNTIME_V2_EMPTY_SUMMARY,
  RUNTIME_V2_MODEL_DELTA_CHARACTERS,
  RUNTIME_V2_MODEL_SUMMARY_CHARACTERS,
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

  it('splits an over-long answer so no single delta breaks the contract', () => {
    // A single event above the cap is one the client is obliged to reject, so
    // the server must not emit it in the first place.
    const text = 'x'.repeat(RUNTIME_V2_MODEL_DELTA_CHARACTERS * 2 + 10);
    const deltas = buildRuntimeV2ModelEvents('turn_0000001', text).filter(
      (event) => event.type === 'model.delta',
    );

    expect(deltas).toHaveLength(3);
    for (const delta of deltas) {
      const { payload } = delta;
      expect('text' in payload ? payload.text.length : 0).toBeLessThanOrEqual(
        RUNTIME_V2_MODEL_DELTA_CHARACTERS,
      );
    }
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
