import { describe, expect, it } from 'vitest';

import { THINKING_STREAM_HOLD_MAX_CHARS } from '../../constants/thinking-scanner.constants';
import { type ScannedFragment } from '../../types/thinking-scanner.types';
import { StreamingReasoningSplitter } from '../reasoning-splitter.utility';

// Feeds `chunks` one by one, recording what each push released, then flushes.
function feed(
  chunks: readonly string[],
  splitter = new StreamingReasoningSplitter(),
): { steps: ScannedFragment[]; content: string; reasoning: string } {
  const steps = chunks.map((chunk) => splitter.push(chunk));
  steps.push(splitter.flush());
  return {
    steps,
    content: steps.map((step) => step.content).join(''),
    reasoning: steps.map((step) => step.reasoning).join(''),
  };
}

// The GLM prod payload (rule 56), as an OpenAI-compatible stream would cut it.
const GLM_CHUNKS = [
  'The attachment is a voice note',
  " that couldn't be transcribed. I already told them.",
  ' Be concise.</th',
  'ink>\n\nSame voice note, same problem: ',
  "transcription failed. I can't hear it.",
];

describe('StreamingReasoningSplitter (rule 56, one implementation)', () => {
  it('closing-tag-only (GLM): emits NO answer text before the tag, reasoning after it', () => {
    const { steps, content, reasoning } = feed(GLM_CHUNKS);
    // Nothing reached the answer channel while the reasoning was streaming.
    expect(steps.slice(0, 3).every((step) => step.content === '')).toBe(true);
    expect(reasoning).toBe(
      "The attachment is a voice note that couldn't be transcribed. I already told them. Be concise.",
    );
    expect(content).toBe("Same voice note, same problem: transcription failed. I can't hear it.");
    expect(content).not.toContain('Be concise');
  });

  it('open + close tags split across chunks', () => {
    const { content, reasoning } = feed(['<thi', 'nk>plan it', '</think>', 'The answer.']);
    expect(reasoning).toBe('plan it');
    expect(content).toBe('The answer.');
  });

  it('a reasoning FIELD releases held content at once as answer text', () => {
    const splitter = new StreamingReasoningSplitter();
    expect(splitter.push('Hello')).toEqual({ content: '', reasoning: '' });
    expect(splitter.noteReasoningChannel()).toEqual({ content: 'Hello', reasoning: '' });
    // After that nothing is held: the answer streams through.
    expect(splitter.push(' world')).toEqual({ content: ' world', reasoning: '' });
  });

  it('a reasoning field BEFORE any content means no hold at all', () => {
    const splitter = new StreamingReasoningSplitter();
    expect(splitter.noteReasoningChannel()).toEqual({ content: '', reasoning: '' });
    expect(splitter.push('Hi')).toEqual({ content: 'Hi', reasoning: '' });
  });

  it('no reasoning at all: held for at most the bounded prefix, then streams unchanged', () => {
    const splitter = new StreamingReasoningSplitter();
    const answer = 'x'.repeat(THINKING_STREAM_HOLD_MAX_CHARS - 1);
    expect(splitter.push(answer)).toEqual({ content: '', reasoning: '' });
    // The char that reaches the bound releases everything held.
    expect(splitter.push('y')).toEqual({ content: `${answer}y`, reasoning: '' });
    expect(splitter.releasedWithoutEvidence).toBe(true);
    expect(splitter.push('z')).toEqual({ content: 'z', reasoning: '' });
  });

  it('a short answer with no tag comes out whole at the end of the stream', () => {
    const { content, reasoning } = feed(['Hi', ' there', '!']);
    expect(content).toBe('Hi there!');
    expect(reasoning).toBe('');
  });

  it('an opening tag later in the prefix decides at once (answer before it stays answer)', () => {
    const splitter = new StreamingReasoningSplitter();
    expect(splitter.push('Answer first. <think>then')).toEqual({
      content: 'Answer first. ',
      reasoning: 'then',
    });
    expect(splitter.sawReasoningTag).toBe(true);
  });

  it('a closing tag quoted in inline code is text, not a delimiter', () => {
    const { content, reasoning } = feed(['GLM ends with `</think>` — strip it.']);
    expect(content).toBe('GLM ends with `</think>` — strip it.');
    expect(reasoning).toBe('');
  });

  it('a bare close past the bound is NOT recognised live (the executor re-splits the stored answer)', () => {
    const long = 'r'.repeat(THINKING_STREAM_HOLD_MAX_CHARS);
    const splitter = new StreamingReasoningSplitter();
    const first = splitter.push(long);
    expect(first.content).toBe(long);
    expect(splitter.releasedWithoutEvidence).toBe(true);
  });
});
