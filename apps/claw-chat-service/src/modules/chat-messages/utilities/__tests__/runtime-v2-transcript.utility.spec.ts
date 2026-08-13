import { RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS } from '../../constants/runtime-v2-transcript.constants';
import type { RuntimeResultDto } from '../../dto/runtime-v2.dto';
import { buildRuntimeV2ToolResultRecord } from '../runtime-v2-transcript.utility';

// The transcript copy of a tool result used to be shortened by slicing the
// SERIALISED document at the character bound. That cut wherever the bound
// landed — inside a file's `content` — and took the `hash` that followed with
// it. `patch` cannot write without that hash, so the next turn re-read the
// file, narrated, lost it again, and looped. Observed live, in the agent's own
// words: "The transcript is truncating the `content` field so I can't see the
// `hash` value." These tests pin the inversion: identity survives, payload goes.

const HASH = `sha256:${'9'.repeat(64)}`;

function readResult(content: string): RuntimeResultDto['result'] {
  return {
    status: 'succeeded',
    structured: {
      path: 'apps/claw-frontend/src/components/auth/reset-password-form.tsx',
      hash: HASH,
      byteLength: content.length,
      lineCount: 99,
      content,
    },
  } as unknown as RuntimeResultDto['result'];
}

describe('buildRuntimeV2ToolResultRecord', () => {
  it('leaves a result that already fits completely untouched', () => {
    const record = buildRuntimeV2ToolResultRecord(readResult('short'));

    expect(JSON.parse(record)).toEqual({
      status: 'succeeded',
      structured: {
        path: 'apps/claw-frontend/src/components/auth/reset-password-form.tsx',
        hash: HASH,
        byteLength: 5,
        lineCount: 99,
        content: 'short',
      },
      modelText: null,
      error: null,
    });
  });

  it('keeps the hash whole when the content is far over budget', () => {
    // The defect in one assertion: this is the field `patch` needs and the
    // field the old slice destroyed first.
    const record = buildRuntimeV2ToolResultRecord(readResult('x'.repeat(50_000)));

    expect(record).toContain(HASH);
    expect(JSON.parse(record).structured.hash).toBe(HASH);
  });

  it('still honours the character bound while keeping the hash', () => {
    const record = buildRuntimeV2ToolResultRecord(readResult('x'.repeat(50_000)));

    expect(record.length).toBeLessThanOrEqual(RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS);
  });

  it('spends the budget on the payload, not on the identity fields', () => {
    const record = buildRuntimeV2ToolResultRecord(readResult('x'.repeat(50_000)));
    const structured = JSON.parse(record).structured;

    expect(structured.path).toBe('apps/claw-frontend/src/components/auth/reset-password-form.tsx');
    expect(structured.byteLength).toBe(50_000);
    expect(structured.lineCount).toBe(99);
    expect(structured.content).not.toContain('x'.repeat(1_000));
  });

  it('records how many entries a long listing dropped instead of cutting mid-array', () => {
    const listing = {
      status: 'succeeded',
      structured: {
        path: 'src',
        hash: HASH,
        entries: Array.from({ length: 400 }, (_, i) => `file-${String(i)}.ts`),
      },
    } as unknown as RuntimeResultDto['result'];

    const record = buildRuntimeV2ToolResultRecord(listing);

    expect(JSON.parse(record).structured.hash).toBe(HASH);
    expect(record).toContain('more omitted in transcript');
    expect(record.length).toBeLessThanOrEqual(RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS);
  });

  it('holds the bound even when the bulk is spread across many distinct keys', () => {
    // No single leaf is oversized here, so the clip steps cannot help and the
    // last-resort slice has to carry it. The bound is not allowed to leak.
    const wide = {
      status: 'succeeded',
      structured: Object.fromEntries(
        Array.from({ length: 300 }, (_, i) => [`key-${String(i)}`, `v${String(i)}`]),
      ),
    } as unknown as RuntimeResultDto['result'];

    expect(buildRuntimeV2ToolResultRecord(wide).length).toBeLessThanOrEqual(
      RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS,
    );
  });
});
