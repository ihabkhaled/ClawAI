// A voice note sent with "." as its text got "Is there something I can help
// you with?" from gemini-2.5-pro on 2026-09-25: the transcript was in the
// prompt, but the final user turn — the part a model answers — said nothing.
// These pin the rewrite that makes an attachment-only turn a real request.
import {
  ATTACHMENT_ONLY_ROUTING_HINT,
  ATTACHMENT_ONLY_TURN_MARKER,
} from '../../constants/attachment-only-turn.constants';
import {
  buildAttachmentOnlyInstruction,
  isTrivialUserText,
  resolveRoutingContent,
  resolveUserTurnText,
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
