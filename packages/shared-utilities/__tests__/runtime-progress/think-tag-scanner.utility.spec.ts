import { ThinkTagScanner } from '../../src/runtime-progress/think-tag-scanner.utility';

describe('ThinkTagScanner', () => {
  it('separates reasoning and content from chunks split across the opening tag', () => {
    const scanner = new ThinkTagScanner();
    const chunks = ['<thi', 'nk>first step', ' second step</th', 'ink>The answer is 391.'];
    let reasoning = '';
    let content = '';
    for (const chunk of chunks) {
      const slice = scanner.push(chunk);
      reasoning += slice.reasoning;
      content += slice.content;
    }
    const tail = scanner.drain();
    reasoning += tail.reasoning;
    content += tail.content;

    expect(reasoning).toBe('first step second step');
    expect(content).toBe('The answer is 391.');
  });

  it('handles multiple reasoning blocks interleaved with content', () => {
    const scanner = new ThinkTagScanner();
    let reasoning = '';
    let content = '';
    const slice1 = scanner.push('intro <think>a</think> middle <think>b</think> tail');
    reasoning += slice1.reasoning;
    content += slice1.content;
    const tail = scanner.drain();
    reasoning += tail.reasoning;
    content += tail.content;

    expect(reasoning).toBe('ab');
    expect(content).toBe('intro  middle  tail');
  });

  it('treats a lone closing tag with no opening as content', () => {
    const scanner = new ThinkTagScanner();
    const slice = scanner.push('plain text </think> more text');
    const tail = scanner.drain();
    expect(slice.reasoning + tail.reasoning).toBe('');
    expect(slice.content + tail.content).toBe('plain text </think> more text');
  });

  it('drains an unclosed reasoning block as reasoning', () => {
    const scanner = new ThinkTagScanner();
    const slice = scanner.push('before <think>partial reasoning never closed');
    const tail = scanner.drain();
    // The unclosed reasoning text may be emitted across the push and drain
    // calls — the combined sum must contain every reasoning byte exactly once
    // and no content bytes after `before `.
    expect(slice.reasoning + tail.reasoning).toBe('partial reasoning never closed');
    expect(slice.content + tail.content).toBe('before ');
  });

  it('supports custom tags via the constructor option', () => {
    const scanner = new ThinkTagScanner({ tags: ['scratch'] });
    let reasoning = '';
    let content = '';
    const slice = scanner.push('say <scratch>hidden</scratch> visible');
    reasoning += slice.reasoning;
    content += slice.content;
    const tail = scanner.drain();
    reasoning += tail.reasoning;
    content += tail.content;

    expect(reasoning).toBe('hidden');
    expect(content).toBe('say  visible');
  });

  it('passes through chunks with no tags as content', () => {
    const scanner = new ThinkTagScanner();
    let reasoning = '';
    let content = '';
    for (const chunk of ['hello ', 'world ', 'no tags here']) {
      const slice = scanner.push(chunk);
      reasoning += slice.reasoning;
      content += slice.content;
    }
    const tail = scanner.drain();
    reasoning += tail.reasoning;
    content += tail.content;

    expect(reasoning).toBe('');
    expect(content).toBe('hello world no tags here');
  });

  it('returns empty slices from a fresh scanner that has not been pushed to', () => {
    const scanner = new ThinkTagScanner();
    const tail = scanner.drain();
    expect(tail.reasoning).toBe('');
    expect(tail.content).toBe('');
  });

  it('drains correctly after the final chunk has been fully pushed', () => {
    const scanner = new ThinkTagScanner();
    let reasoning = '';
    let content = '';
    const slice = scanner.push('<think>complete</think>final answer');
    reasoning += slice.reasoning;
    content += slice.content;
    const tail = scanner.drain();
    reasoning += tail.reasoning;
    content += tail.content;

    expect(reasoning).toBe('complete');
    expect(content).toBe('final answer');
    // Second drain on the same scanner should be a no-op.
    const secondDrain = scanner.drain();
    expect(secondDrain.reasoning).toBe('');
    expect(secondDrain.content).toBe('');
  });

  it('recognizes the alternate <thinking> tag from the default set', () => {
    const scanner = new ThinkTagScanner();
    const slice = scanner.push('lead <thinking>r</thinking> trail');
    const tail = scanner.drain();
    expect(slice.reasoning + tail.reasoning).toBe('r');
    expect(slice.content + tail.content).toBe('lead  trail');
  });

  it('returns empty slices when push is called with an empty string', () => {
    const scanner = new ThinkTagScanner();
    const slice = scanner.push('');
    expect(slice.reasoning).toBe('');
    expect(slice.content).toBe('');
  });

  it('makes a second drain a no-op after the buffer is fully consumed', () => {
    const scanner = new ThinkTagScanner();
    const pushSlice = scanner.push('<think>reasoning so far');
    // The push itself may have already emitted everything as reasoning.
    const first = scanner.drain();
    // Combined push+drain must contain the full reasoning text.
    expect(pushSlice.reasoning + first.reasoning).toBe('reasoning so far');
    // A second drain is always a no-op.
    const second = scanner.drain();
    expect(second.reasoning).toBe('');
    expect(second.content).toBe('');
  });

  it('drains buffered bytes inside reasoning when a partial close tag is suspended', () => {
    const scanner = new ThinkTagScanner();
    // After this push the trailing "</thi" looks like the start of a close
    // tag, so the scanner suspends those bytes until drain.
    const pushSlice = scanner.push('<think>secret stuff</thi');
    const drainSlice = scanner.drain();
    // Combined emission must contain every byte of reasoning exactly once.
    expect(pushSlice.reasoning + drainSlice.reasoning).toBe('secret stuff</thi');
    expect(pushSlice.content + drainSlice.content).toBe('');
  });

  it('falls back to the default tags when an empty tags array is passed', () => {
    const scanner = new ThinkTagScanner({ tags: [] });
    const slice = scanner.push('a <think>b</think> c');
    const tail = scanner.drain();
    expect(slice.reasoning + tail.reasoning).toBe('b');
    expect(slice.content + tail.content).toBe('a  c');
  });
});
