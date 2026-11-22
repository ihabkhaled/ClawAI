import { ThreadPublicationType } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { buildBriefUserPrompt, conversationSeed } from '../article-brief-prompt.utility';
import { buildSharedMaterial } from '../shared-material.utility';
import { shrinkSharedMaterial } from '../shrink-source.utility';
import { withAttachmentTurns } from '../source-attachments.utility';

type Turn = { role: string; content: string; kind?: string; attachedTo?: string };

const snapshotWith = (text: string, extra: Record<string, unknown> = {}) => ({
  sourceThreadId: 'thread-1',
  title: 'RFID',
  messages: [
    {
      id: 'm1',
      role: 'USER',
      content: 'Write about my notes',
      createdAt: '2026-11-22T00:00:00.000Z',
      attachments: [{ name: 'notes.md', mimeType: 'text/markdown', text }],
    },
    { id: 'm2', role: 'ASSISTANT', content: 'Sure.', createdAt: '2026-11-22T00:01:00.000Z' },
  ],
  ...extra,
});

describe('withAttachmentTurns', () => {
  it('puts each attached file right after its message as a framed turn', () => {
    const result = withAttachmentTurns(snapshotWith('Tags answer at 13.56 MHz.'));
    const turns = result['messages'] as Turn[];

    expect(turns.map(({ content }) => content)).toEqual([
      'Write about my notes',
      'Attached file notes.md:\nTags answer at 13.56 MHz.',
      'Sure.',
    ]);
    expect(turns[1]).toMatchObject({ role: 'USER', kind: 'ATTACHMENT', attachedTo: 'm1' });
    expect(turns[0]).not.toHaveProperty('attachments');
  });

  it('returns a snapshot without attachments as the same object, so old prompts keep their hash', () => {
    const plain = { messages: [{ id: 'm1', role: 'USER', content: 'Hi' }] };

    expect(withAttachmentTurns(plain)).toBe(plain);
  });
});

describe('attachment text in the role prompts', () => {
  it('reaches sourceConversation and is condensed like a long message when the window is short', () => {
    const text = `BEGIN ${'detail '.repeat(20_000)} FINISH`;
    const material = buildSharedMaterial(
      {
        topic: 'Very long',
        publicationType: ThreadPublicationType.ARTICLE,
        sourceSnapshot: snapshotWith(text),
      },
      {},
    );
    expect(material).toContain('Attached file notes.md:');

    const shrunk = JSON.parse(shrinkSharedMaterial(material, 1)) as {
      sourceConversation: { messages: Turn[]; fitNote?: string };
    };
    const attached = shrunk.sourceConversation.messages.find(({ kind }) => kind === 'ATTACHMENT');
    expect(attached?.content.startsWith('Attached file notes.md:\nBEGIN')).toBe(true);
    expect(attached?.content.endsWith('FINISH')).toBe(true);
    expect(attached?.content).toContain('characters omitted to fit the model window');
    expect(shrunk.sourceConversation.fitNote).toContain('show only their beginning and end');
  });

  it('gives the planner the attached text and the omission note, and seeds research from it', () => {
    const snapshot = snapshotWith('A survey of passive UHF RFID tag antennas and their range', {
      attachmentNote: 'Attached file text: 1 attached file(s) had no readable text.',
    });
    const prompt = buildBriefUserPrompt('Make it long', snapshot);

    expect(prompt).toContain('Attached file notes.md:');
    expect(prompt).toContain('1 attached file(s) had no readable text');
    expect(conversationSeed(snapshot)).toContain('passive UHF RFID');
  });
});
