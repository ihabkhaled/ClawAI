import { ThinkingFragmentScanner } from '../utilities/thinking-fragment-scanner.utility';

describe('ThinkingFragmentScanner', () => {
  it('passes through plain content with no tags', () => {
    const scanner = new ThinkingFragmentScanner();
    const r = scanner.push('Hello world');
    expect(r.content).toBe('Hello world');
    expect(r.reasoning).toBe('');
  });

  it('separates a complete <think> block within one chunk', () => {
    const scanner = new ThinkingFragmentScanner();
    const r = scanner.push('Answer<think>secret plan</think>done');
    expect(r.content).toBe('Answerdone');
    expect(r.reasoning).toBe('secret plan');
  });

  it('handles an opening tag split across two chunks', () => {
    const scanner = new ThinkingFragmentScanner();
    const a = scanner.push('Hi <thi');
    const b = scanner.push('nk>reasoning here</think>bye');
    expect(a.content).toBe('Hi ');
    expect(a.reasoning).toBe('');
    expect(b.content).toBe('bye');
    expect(b.reasoning).toBe('reasoning here');
  });

  it('handles a closing tag split across chunks', () => {
    const scanner = new ThinkingFragmentScanner();
    scanner.push('<think>thinking');
    const b = scanner.push(' more</thi');
    const c = scanner.push('nk>visible');
    expect(b.reasoning).toBe(' more');
    expect(c.content).toBe('visible');
  });

  it('supports <reasoning> and <thought> variants case-insensitively', () => {
    const scanner = new ThinkingFragmentScanner();
    const r = scanner.push('a<REASONING>x</REASONING>b<Thought>y</Thought>c');
    expect(r.content).toBe('abc');
    expect(r.reasoning).toBe('xy');
  });

  it('flushes a dangling unterminated reasoning block as reasoning', () => {
    const scanner = new ThinkingFragmentScanner();
    const r = scanner.push('text<think>still thinking');
    const f = scanner.flush();
    expect(r.content).toBe('text');
    expect(r.reasoning).toBe('still thinking');
    expect(f.reasoning).toBe('');
  });

  it('does not leak a partial trailing tag prefix into content', () => {
    const scanner = new ThinkingFragmentScanner();
    const r = scanner.push('answer<');
    expect(r.content).toBe('answer');
    const f = scanner.flush();
    expect(f.content).toBe('<');
  });
});
