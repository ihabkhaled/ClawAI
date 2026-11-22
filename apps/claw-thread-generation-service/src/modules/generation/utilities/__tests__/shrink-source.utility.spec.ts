import { shrinkSharedMaterial, shrinkSnapshot } from '../shrink-source.utility';

const message = (index: number, content: string) => ({
  id: `m${String(index)}`,
  role: index % 2 === 0 ? 'USER' : 'ASSISTANT',
  content,
  createdAt: '2026-10-14T00:00:00.000Z',
});

type Message = { id: string; content: string };

const totalChars = (messages: Message[]) =>
  messages.reduce((total, { content }) => total + [...content].length, 0);

describe('shrinkSnapshot (condensed, never head-cut)', () => {
  it('keeps every message in order and condenses long ones by beginning and end', () => {
    const messages = Array.from({ length: 40 }, (_, index) =>
      message(index, `start ${String(index)} ${'body '.repeat(400)} end ${String(index)}`),
    );
    const shrunk = shrinkSnapshot({ messages }, 1);
    const kept = shrunk['messages'] as Message[];

    expect(kept.map(({ id }) => id)).toEqual(messages.map(({ id }) => id));
    expect(kept[0]?.content.startsWith('start 0')).toBe(true);
    expect(kept[0]?.content.endsWith('end 0')).toBe(true);
    expect(kept[0]?.content).toContain('characters omitted to fit the model window');
    expect(shrunk['shrunk']).toBe(true);
    expect(String(shrunk['fitNote'])).toContain(
      '40 of 40 messages show only their beginning and end',
    );
  });

  it('keeps about a quarter per level and less again at the next level', () => {
    const messages = Array.from({ length: 40 }, (_, index) =>
      message(index, `${String(index)} ${'x'.repeat(1_000)}`),
    );
    const original = totalChars(messages);
    const one = totalChars(shrinkSnapshot({ messages }, 1)['messages'] as Message[]);
    const two = totalChars(shrinkSnapshot({ messages }, 2)['messages'] as Message[]);

    expect(one).toBeLessThan(original * 0.3);
    expect(two).toBeLessThan(one);
  });

  it('gives owner turns and newer turns a larger share than old replies', () => {
    const messages = Array.from({ length: 10 }, (_, index) =>
      message(index, `${String(index)} ${'y'.repeat(4_000)}`),
    );
    const kept = shrinkSnapshot({ messages }, 1)['messages'] as Message[];
    const size = (index: number) => [...(kept[index]?.content ?? '')].length;

    expect(size(8)).toBeGreaterThan(size(1));
    expect(size(9)).toBeGreaterThan(size(1));
  });

  it('keeps a regenerated answer once, at its newest place, and says so', () => {
    const answer = 'architecture '.repeat(800);
    const messages = [
      message(0, 'design it'),
      message(1, answer),
      message(2, 'Ok'),
      message(3, 'other '.repeat(2_000)),
      message(4, 'Ok'),
      message(5, answer),
    ];
    const shrunk = shrinkSnapshot({ messages }, 1);
    const kept = shrunk['messages'] as Message[];

    expect(kept.map(({ id }) => id)).toEqual(['m0', 'm2', 'm3', 'm4', 'm5']);
    expect(String(shrunk['fitNote'])).toContain('1 repeated message(s) removed');
  });

  it('clips a huge message without splitting an emoji pair', () => {
    const huge = '😀'.repeat(20_000);
    const out = shrinkSnapshot({ messages: [message(0, huge)] }, 1)['messages'] as Message[];
    const content = out[0]?.content ?? '';

    expect([...content].length).toBeLessThan(6_000);
    expect(
      content.replace(/\n\[… \d+ characters omitted to fit the model window …\]\n/u, ''),
    ).toMatch(/^(?:😀)+$/u);
  });

  it('condenses right-to-left text by characters and leaves a short one alone', () => {
    const arabic = 'مرحبا '.repeat(3_000);
    const out = shrinkSnapshot({ messages: [message(0, arabic), message(1, 'قصير')] }, 1)[
      'messages'
    ] as Message[];

    expect(out[0]?.content.length).toBeLessThan(arabic.length);
    expect(out[1]?.content).toBe('قصير');
  });

  it('omits middle messages only when a floor share cannot fit, keeping the first and newest', () => {
    const messages = Array.from({ length: 400 }, (_, index) =>
      message(index, `${String(index)} ${'z'.repeat(200)}`),
    );
    const shrunk = shrinkSnapshot({ messages }, 3);
    const kept = shrunk['messages'] as Message[];

    expect(kept.length).toBeLessThan(400);
    expect(kept[0]?.id).toBe('m0');
    expect(kept.at(-1)?.id).toBe('m399');
    expect(String(shrunk['fitNote'])).toMatch(/\d+ older message\(s\) from the middle omitted/u);
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
  const longMessages = Array.from({ length: 30 }, (_, index) =>
    message(index, `${String(index)} ${'w'.repeat(2_000)}`),
  );

  it('shrinks sourceConversation (material v2) and keeps the evidence and instructions', () => {
    const material = JSON.stringify({
      version: 2,
      authorInstructions: 'write it very long',
      sourceConversation: { messages: longMessages },
      researchEvidence: { items: [1] },
    });
    const parsed = JSON.parse(shrinkSharedMaterial(material, 1)) as {
      authorInstructions: string;
      sourceConversation: { messages: Message[]; fitNote: string };
      researchEvidence: unknown;
    };

    expect(parsed.sourceConversation.messages).toHaveLength(30);
    expect(totalChars(parsed.sourceConversation.messages)).toBeLessThan(totalChars(longMessages));
    expect(parsed.sourceConversation.fitNote).toContain('Condensed to fit the model window');
    expect(parsed.researchEvidence).toEqual({ items: [1] });
    expect(parsed.authorInstructions).toBe('write it very long');
  });

  it('still reads v1 material that names the source sourceSnapshot', () => {
    const material = JSON.stringify({ topic: 't', sourceSnapshot: { messages: longMessages } });
    const parsed = JSON.parse(shrinkSharedMaterial(material, 1)) as {
      sourceSnapshot: { shrunk: boolean };
    };

    expect(parsed.sourceSnapshot.shrunk).toBe(true);
  });

  it('returns text that is not the shared JSON unchanged', () => {
    expect(shrinkSharedMaterial('not json', 1)).toBe('not json');
    expect(shrinkSharedMaterial('{"a":1}', 1)).toBe('{"a":1}');
  });
});
