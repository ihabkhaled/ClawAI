// A voice note sent with "." as its text got "Is there something I can help
// you with?" from gemini-2.5-pro on 2026-09-25: the transcript was in the
// prompt, but the final user turn — the part a model answers — said nothing.
// These pin the rewrite that makes an attachment-only turn a real request.
import {
  ATTACHMENT_ONLY_ROUTING_HINT,
  ATTACHMENT_ONLY_TURN_MARKER,
  ATTACHMENT_ONLY_UNREADABLE_INSTRUCTION,
} from '../../constants/attachment-only-turn.constants';
import {
  buildAttachmentOnlyInstruction,
  isTrivialUserText,
  resolveContextTurnText,
  resolveRoutingContent,
  resolveUserTurnText,
  withAttachmentOnlyUserTurn,
} from '../attachment-only-turn.utility';

const file = (mimeType: string, filename: string): { mimeType: string; filename: string } => ({
  mimeType,
  filename,
});

describe('isTrivialUserText', () => {
  it.each(['', ' ', '\n\t', '.', '...', '?', '!!', ' . ', '…', '،', '。', '-'])(
    'treats %j as no message',
    (text) => {
      expect(isTrivialUserText(text)).toBe(true);
    },
  );

  it.each(['hi', 'ok', 'a', '1', 'ما هذا', '这是什么', 'summarize this'])(
    'treats %j as a real message',
    (text) => {
      expect(isTrivialUserText(text)).toBe(false);
    },
  );
});

describe('buildAttachmentOnlyInstruction', () => {
  it('tells the model to answer what a voice note SAID, in its language', () => {
    const text = buildAttachmentOnlyInstruction([file('audio/webm', 'note.webm')]);

    expect(text).toContain(ATTACHMENT_ONLY_TURN_MARKER);
    expect(text).toContain('what the speaker said');
    expect(text).toContain('language');
    expect(text).toContain('"note.webm"');
    expect(text).not.toContain('summarize its key points');
  });

  it('asks for a summary and next steps for a document', () => {
    const text = buildAttachmentOnlyInstruction([file('application/pdf', 'cv.pdf')]);

    expect(text).toContain('summarize its key points');
    expect(text).toContain('next steps');
  });

  it('asks for a description of an image and of a video', () => {
    const text = buildAttachmentOnlyInstruction([
      file('image/png', 'a.png'),
      file('video/mp4', 'b.mp4'),
    ]);

    expect(text).toContain('For an image');
    expect(text).toContain('For a video');
  });

  it('states each kind once however many files share it', () => {
    const text = buildAttachmentOnlyInstruction([
      file('audio/ogg', '1.ogg'),
      file('audio/ogg', '2.ogg'),
    ]);

    expect(text.split('For a voice note').length - 1).toBe(1);
  });

  it('forbids the generic "how can I help" reply', () => {
    const text = buildAttachmentOnlyInstruction([file('text/plain', 'a.txt')]);

    expect(text).toContain('do not ask what they want');
  });
});

describe('resolveUserTurnText', () => {
  it('replaces a trivial turn when files are attached', () => {
    const result = resolveUserTurnText('.', [file('audio/webm', 'v.webm')]);

    expect(result).toContain(ATTACHMENT_ONLY_TURN_MARKER);
    expect(result).not.toBe('.');
  });

  it('keeps real text untouched even with files attached', () => {
    expect(resolveUserTurnText('translate this', [file('audio/webm', 'v.webm')])).toBe(
      'translate this',
    );
  });

  it('keeps a trivial turn untouched when nothing is attached', () => {
    expect(resolveUserTurnText('.', [])).toBe('.');
  });
});

describe('resolveRoutingContent', () => {
  it('gives the router something to score for an attachment-only send', () => {
    expect(resolveRoutingContent('', { fileIds: ['f1'] })).toBe(ATTACHMENT_ONLY_ROUTING_HINT);
  });

  it('passes real text through', () => {
    expect(resolveRoutingContent('hello', { fileIds: ['f1'] })).toBe('hello');
  });

  it('passes a trivial text through when there are no files', () => {
    expect(resolveRoutingContent('.', null)).toBe('.');
    expect(resolveRoutingContent('.', { fileIds: [] })).toBe('.');
    expect(resolveRoutingContent('.', { fileIds: 'nope' })).toBe('.');
  });
});

describe('withAttachmentOnlyUserTurn', () => {
  const row = (role: string, content: string): { role: string; content: string } => ({
    role,
    content,
  });

  it('rewrites the latest USER row of an attachment-only send, and only that one', () => {
    const rows = [row('USER', ''), row('ASSISTANT', 'hi'), row('USER', '.')];
    const result = withAttachmentOnlyUserTurn(rows, {
      fileContents: [file('video/mp4', 'clip.mp4')],
    });
    expect(result[0]?.content).toBe('');
    expect(result[1]?.content).toBe('hi');
    expect(result[2]?.content).toContain(ATTACHMENT_ONLY_TURN_MARKER);
    expect(result[2]?.content).toContain('For a video');
    // Per request only: the caller's rows are never mutated.
    expect(rows[2]?.content).toBe('.');
  });

  it('rewrites the question a Repair run windows at, when an assistant row is last', () => {
    const rows = [row('USER', ''), row('ASSISTANT', 'draft')];
    const result = withAttachmentOnlyUserTurn(rows, {
      fileContents: [file('application/pdf', 'cv.pdf')],
    });
    expect(result[0]?.content).toContain(ATTACHMENT_ONLY_TURN_MARKER);
    expect(result[1]?.content).toBe('draft');
  });

  it('returns the same array when the user typed a request, attached nothing, or has no turn', () => {
    const typed = [row('USER', 'summarise this')];
    expect(
      withAttachmentOnlyUserTurn(typed, { fileContents: [file('application/pdf', 'a.pdf')] }),
    ).toBe(typed);
    const bare = [row('USER', '')];
    expect(withAttachmentOnlyUserTurn(bare, { fileContents: [] })).toBe(bare);
    const none: Array<{ role: string; content: string }> = [];
    expect(withAttachmentOnlyUserTurn(none, { fileContents: [file('image/png', 'a.png')] })).toBe(
      none,
    );
  });
});

describe('an attachment-only video', () => {
  it('covers both the native and the transcript-and-frames path, and forbids guessing', () => {
    const text = resolveUserTurnText('', [file('video/mp4', 'clip.mp4')]);
    expect(text).toContain('For a video');
    expect(text).toContain('timestamped transcript and sampled frames');
    expect(text).toContain('instead of guessing');
  });
});

describe('an attachment-only turn whose files had nothing readable', () => {
  // A video still processing is not delivered (no bytes, no document yet), so
  // the turn used to reach the model as "" — a generic greeting, or a
  // provider refusing an empty message, which the user saw as silence.
  it('tells the model a file was sent but could not be read', () => {
    expect(resolveUserTurnText('', [], 1)).toBe(ATTACHMENT_ONLY_UNREADABLE_INSTRUCTION);
    expect(resolveContextTurnText('.', { fileContents: [], requestedAttachmentCount: 2 })).toBe(
      ATTACHMENT_ONLY_UNREADABLE_INSTRUCTION,
    );
  });

  it('keeps typed text, and an empty turn with nothing attached, as they are', () => {
    expect(resolveUserTurnText('what is this?', [], 1)).toBe('what is this?');
    expect(resolveContextTurnText('', { fileContents: [] })).toBe('');
  });

  it('rewrites the stored row for the lab stages too', () => {
    const rows = [{ role: 'USER', content: '' }];
    const result = withAttachmentOnlyUserTurn(rows, {
      fileContents: [],
      requestedAttachmentCount: 1,
    });
    expect(result[0]?.content).toBe(ATTACHMENT_ONLY_UNREADABLE_INSTRUCTION);
  });
});
