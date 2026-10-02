import {
  EARLIER_ATTACHMENT_TEXT_MAX_CHARS,
  EARLIER_ATTACHMENTS_MAX_FILES,
} from '../../constants/attachment-awareness.constants';
import type { FileContentResponse } from '../../types/context.types';
import {
  buildAttachmentTurnPointer,
  claimsCannotViewAttachment,
  collectEarlierAttachmentIds,
  isUnreadableScannedDocument,
  limitEarlierFile,
  withAttachmentPointer,
} from '../attachment-awareness.utility';

const row = (role: string, fileIds?: unknown) => ({
  role,
  metadata: fileIds === undefined ? null : { fileIds },
});

describe('collectEarlierAttachmentIds', () => {
  it('returns earlier user turns files, newest first, skipping the current turn', () => {
    const ids = collectEarlierAttachmentIds(
      [
        row('USER', ['a']),
        row('ASSISTANT'),
        row('USER', ['b', 'c']),
        row('ASSISTANT'),
        row('USER', ['now']),
      ],
      ['now'],
      10,
    );

    expect(ids).toEqual(['b', 'c', 'a']);
  });

  it('is bounded and de-duplicated', () => {
    const ids = collectEarlierAttachmentIds(
      [row('USER', ['a', 'b']), row('USER', ['b', 'c', 'd']), row('USER', ['e'])],
      [],
      EARLIER_ATTACHMENTS_MAX_FILES,
    );

    expect(ids).toEqual(['b', 'c', 'd']);
  });

  it('never counts the latest user row as earlier, and ignores junk metadata', () => {
    expect(collectEarlierAttachmentIds([row('USER', ['a'])], [], 5)).toEqual([]);
    expect(
      collectEarlierAttachmentIds(
        [row('USER', 'nope'), row('USER', [1, '', 'ok']), row('USER')],
        [],
        5,
      ),
    ).toEqual(['ok']);
  });
});

describe('limitEarlierFile', () => {
  const file = (extractedText: string | null): FileContentResponse => ({
    id: 'f',
    filename: 'f.pdf',
    mimeType: 'application/pdf',
    content: null,
    extractedText,
  });

  it('cuts long text and says so; leaves short text alone', () => {
    const cut = limitEarlierFile(file('x'.repeat(EARLIER_ATTACHMENT_TEXT_MAX_CHARS * 2)));
    expect(cut.extractedText?.length).toBeLessThan(EARLIER_ATTACHMENT_TEXT_MAX_CHARS + 200);
    expect(cut.extractedText).toContain('shortened');
    expect(limitEarlierFile(file('short')).extractedText).toBe('short');
    expect(limitEarlierFile(file(null)).extractedText).toBeNull();
  });
});

describe('claimsCannotViewAttachment', () => {
  it.each([
    'I understand the user wants guidance, but I cannot view images.',
    "I can't see the screenshot they provided.",
    'I am unable to open the attached file.',
    'I do not have the ability to view images.',
  ])('flags: %s', (text) => {
    expect(claimsCannotViewAttachment(text)).toBe(true);
  });

  it.each([
    'The user wants to know where to press in Postman.',
    'I will look up the Postman send button.',
    'I cannot find the pricing page, so I will search.',
  ])('lets through: %s', (text) => {
    expect(claimsCannotViewAttachment(text)).toBe(false);
  });
});

describe('buildAttachmentTurnPointer', () => {
  it('is empty with nothing attached', () => {
    expect(buildAttachmentTurnPointer({ fileContents: [] })).toBe('');
    expect(withAttachmentPointer('hello', { fileContents: [] })).toBe('hello');
  });

  describe('a scanned PDF OCR could not read', () => {
    const scan = {
      id: 'pdf',
      filename: 'scan.pdf',
      mimeType: 'application/pdf',
      extractedText: '[Image file: scan.pdf]',
    };

    it('is recognised, but a picture or a PDF with text is not', () => {
      expect(isUnreadableScannedDocument(scan)).toBe(true);
      expect(isUnreadableScannedDocument({ ...scan, extractedText: '-- Page 1 -- INVOICE' })).toBe(
        false,
      );
      expect(
        isUnreadableScannedDocument({ ...scan, mimeType: 'image/png', filename: 'a.png' }),
      ).toBe(false);
    });

    it('is reported as unreadable, never as "content is already in this conversation"', () => {
      const pointer = buildAttachmentTurnPointer({ fileContents: [scan] });

      expect(pointer).toContain('could not be opened');
      expect(pointer).not.toContain('already in this conversation');
      expect(pointer).not.toContain('scan.pdf');
    });

    it('keeps the lead for a readable file beside it', () => {
      const pointer = buildAttachmentTurnPointer({
        fileContents: [
          scan,
          { id: 'ok', filename: 'ok.pdf', mimeType: 'application/pdf', extractedText: 'real text' },
        ],
      });

      expect(pointer).toContain('already in this conversation');
      expect(pointer).toContain('"ok.pdf"');
      expect(pointer).toContain('1 attached file(s) could not be opened');
    });
  });

  it('is added once', () => {
    const context = { fileContents: [{ id: 'a', filename: 'a.png', mimeType: 'image/png' }] };
    const once = withAttachmentPointer('hello', context);

    expect(withAttachmentPointer(once, context)).toBe(once);
  });
});
