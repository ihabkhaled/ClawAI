import { shrinkSharedMaterial, shrinkSnapshot } from '../shrink-source.utility';

const message = (index: number, content: string) => ({
  id: `m${String(index)}`,
  role: index % 2 === 0 ? 'USER' : 'ASSISTANT',
  content,
  createdAt: '2026-10-14T00:00:00.000Z',
});

describe('shrinkSnapshot (ADR-181)', () => {
  it('keeps the opening message and the newest ones and drops the middle', () => {
    const messages = Array.from({ length: 40 }, (_, index) =>
      message(index, `text ${String(index)}`),
    );
    const shrunk = shrinkSnapshot({ messages }, 1);
    const kept = shrunk['messages'] as Array<{ id: string }>;
    expect(kept.length).toBe(20);
    expect(kept[0]?.id).toBe('m0');
    expect(kept.at(-1)?.id).toBe('m39');
    expect(shrunk['shrunk']).toBe(true);
  });

  it('halves again at the next level', () => {
    const messages = Array.from({ length: 40 }, (_, index) => message(index, 'x'));
    expect((shrinkSnapshot({ messages }, 2)['messages'] as unknown[]).length).toBe(10);
  });

  it('clips a huge message without splitting an emoji pair', () => {
    const huge = '😀'.repeat(5000);
    const out = shrinkSnapshot({ messages: [message(0, huge)] }, 1)['messages'] as Array<{
      content: string;
    }>;
    const content = out[0]?.content ?? '';
    expect([...content].length).toBeLessThan(800);
    expect(content.endsWith('…')).toBe(true);
    expect(content.replaceAll('😀', '').replaceAll('…', '')).toBe('');
  });

  it('clips right-to-left text by characters and leaves a short one alone', () => {
    const arabic = 'مرحبا '.repeat(1000);
    const out = shrinkSnapshot({ messages: [message(0, arabic), message(1, 'قصير')] }, 1)[
      'messages'
    ] as Array<{ content: string }>;
    expect(out[0]?.content.length).toBeLessThan(arabic.length);
    expect(out[1]?.content).toBe('قصير');
  });

  it('leaves a one-message chat and an empty or missing list unchanged', () => {
    const one = { messages: [message(0, 'only')] };
    expect((shrinkSnapshot(one, 1)['messages'] as unknown[]).length).toBe(1);
    expect(shrinkSnapshot({ messages: [] }, 1)).toEqual({ messages: [] });
    const none = { title: 'x' };
    expect(shrinkSnapshot(none, 1)).toBe(none);
  });

  it('never changes its input', () => {
    const messages = Array.from({ length: 20 }, (_, index) => message(index, 'y'.repeat(4000)));
    const snapshot = { messages };
    shrinkSnapshot(snapshot, 1);
    expect(snapshot.messages.length).toBe(20);
    expect(snapshot.messages[0]?.content.length).toBe(4000);
  });
});

describe('shrinkSharedMaterial', () => {
  it('shrinks the source inside the shared JSON and keeps the evidence', () => {
    const messages = Array.from({ length: 30 }, (_, index) => message(index, 'z'));
    const material = JSON.stringify({
      topic: 't',
      sourceSnapshot: { messages },
      researchEvidence: { items: [1] },
    });
    const parsed = JSON.parse(shrinkSharedMaterial(material, 1)) as {
      sourceSnapshot: { messages: unknown[] };
      researchEvidence: unknown;
    };
    expect(parsed.sourceSnapshot.messages.length).toBe(15);
    expect(parsed.researchEvidence).toEqual({ items: [1] });
  });

  it('returns text that is not the shared JSON unchanged', () => {
    expect(shrinkSharedMaterial('not json', 1)).toBe('not json');
    expect(shrinkSharedMaterial('{"a":1}', 1)).toBe('{"a":1}');
  });
});
