import { describe, expect, it } from 'vitest';

import { MESSAGE_CONTENT_MAX_CHARS } from '@/constants/message-content.constants';
import { PASTED_TEXT_ATTACHMENT_THRESHOLD_CHARS } from '@/constants/pasted-text.constants';
import { sendMessageSchema } from '@/lib/validation/message.schema';
import {
  buildPastedTextFile,
  isLargePaste,
  readClipboardPlainText,
} from '@/utilities/pasted-text.utility';

describe('pasted text (ADR-219)', () => {
  it('keeps a paste at or below the threshold inline', () => {
    expect(isLargePaste('hello')).toBe(false);
    expect(isLargePaste('a'.repeat(PASTED_TEXT_ATTACHMENT_THRESHOLD_CHARS))).toBe(false);
  });

  it('turns a paste above the threshold into an attachment', () => {
    expect(isLargePaste('a'.repeat(PASTED_TEXT_ATTACHMENT_THRESHOLD_CHARS + 1))).toBe(true);
  });

  it('builds a UTF-8 text/plain file named "Pasted text <n>.txt" with every character', async () => {
    const text = `${'é漢字 '.repeat(10_000)}end`;
    const file = buildPastedTextFile(text, 3);
    expect(file.name).toBe('Pasted text 3.txt');
    expect(file.type).toBe('text/plain');
    expect(await file.text()).toBe(text);
    expect(file.size).toBe(new TextEncoder().encode(text).length);
  });

  it('reads plain text from a clipboard and nothing from none', () => {
    const data = { getData: (type: string) => (type === 'text/plain' ? 'x' : '') };
    expect(readClipboardPlainText(data as unknown as DataTransfer)).toBe('x');
    expect(readClipboardPlainText(null)).toBe('');
  });

  it('the threshold sits below the inline message cap, and the cap matches chat-service', () => {
    expect(PASTED_TEXT_ATTACHMENT_THRESHOLD_CHARS).toBeLessThan(MESSAGE_CONTENT_MAX_CHARS);
    expect(MESSAGE_CONTENT_MAX_CHARS).toBe(100_000);
    const at = sendMessageSchema.safeParse({ content: 'a'.repeat(MESSAGE_CONTENT_MAX_CHARS) });
    const over = sendMessageSchema.safeParse({
      content: 'a'.repeat(MESSAGE_CONTENT_MAX_CHARS + 1),
    });
    expect(at.success).toBe(true);
    expect(over.success).toBe(false);
  });
});
