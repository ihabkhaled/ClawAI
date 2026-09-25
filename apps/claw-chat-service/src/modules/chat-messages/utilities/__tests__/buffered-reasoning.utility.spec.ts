import { describe, expect, it } from 'vitest';
import { splitBufferedReasoning, splitOllamaMessageReasoning } from '../buffered-reasoning.utility';

// Captured from prod chat_messages (OLLAMA / glm-5.3, Direct mode,
// 2026-09-25 12:47 UTC). GLM's chat template injects the opening <think>
// itself, so the model's output starts INSIDE the reasoning and only the
// closing tag ever appears. The frontend's markdown drops the unknown
// </think> element, which is why users saw "Be concise.Same voice note".
const GLM_PROD_CONTENT =
  "The attachment is a voice note that couldn't be transcribed (429 error). I already told them. They resent the same file. I still can't transcribe it. Be concise.</think>Same voice note, same problem: transcription failed (error 429). I can't hear it — type it out instead.";

describe('splitBufferedReasoning', () => {
  it('moves the text before a bare closing tag into reasoning (GLM prod payload)', () => {
    expect(splitBufferedReasoning(GLM_PROD_CONTENT)).toEqual({
      content:
        "Same voice note, same problem: transcription failed (error 429). I can't hear it — type it out instead.",
      reasoning:
        "The attachment is a voice note that couldn't be transcribed (429 error). I already told them. They resent the same file. I still can't transcribe it. Be concise.",
    });
  });

  it('splits a complete <think> block out of the answer', () => {
    expect(splitBufferedReasoning('<think>plan the reply</think>\n\nHello there.')).toEqual({
      content: 'Hello there.',
      reasoning: 'plan the reply',
    });
  });

  it('handles the other tag spellings and any letter case', () => {
    expect(splitBufferedReasoning('<Thinking>a</Thinking>b')).toEqual({
      content: 'b',
      reasoning: 'a',
    });
    expect(splitBufferedReasoning('weighing options</REASONING>answer')).toEqual({
      content: 'answer',
      reasoning: 'weighing options',
    });
  });

  it('treats an unterminated opening tag as reasoning to the end', () => {
    expect(splitBufferedReasoning('Answer first. <think>then a trailing thought')).toEqual({
      content: 'Answer first.',
      reasoning: 'then a trailing thought',
    });
  });

  it('returns content that carries no tag byte-for-byte unchanged', () => {
    const plain = '  Indented code:\n\n    const a = 1;\n';
    expect(splitBufferedReasoning(plain)).toEqual({ content: plain, reasoning: '' });
  });

  it('leaves a closing tag quoted in inline code alone', () => {
    const answer = 'GLM ends its reasoning with `</think>` — strip it before display.';
    expect(splitBufferedReasoning(answer)).toEqual({ content: answer, reasoning: '' });
  });

  it('strips an EMPTY think block (a thinking model with thinking switched off)', () => {
    expect(splitBufferedReasoning('<think>\n\n</think>\n\nThe answer.')).toEqual({
      content: 'The answer.',
      reasoning: '',
    });
  });

  it('yields empty content when the model only reasoned', () => {
    expect(splitBufferedReasoning('only thinking here</think>   ')).toEqual({
      content: '',
      reasoning: 'only thinking here',
    });
  });
});

describe('splitOllamaMessageReasoning', () => {
  it('puts the thinking field first, then inline reasoning, and cleans the answer', () => {
    expect(
      splitOllamaMessageReasoning({
        role: 'assistant',
        thinking: 'field thought',
        content: 'inline thought</think>The answer.',
      }),
    ).toEqual({ content: 'The answer.', reasoning: 'field thought\n\ninline thought' });
  });

  it('returns empty strings for a missing message', () => {
    expect(splitOllamaMessageReasoning(undefined)).toEqual({ content: '', reasoning: '' });
  });
});
