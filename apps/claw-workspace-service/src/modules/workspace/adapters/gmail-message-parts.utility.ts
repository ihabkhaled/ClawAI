import type { GmailHeader, GmailMessagePart } from '../types/gmail-api.types';

/**
 * Pure helpers for traversing Gmail's MIME tree. Extracted from
 * `gmail.adapter.ts` to keep the adapter under the 500-line file ceiling.
 * No I/O — every function takes already-fetched message parts and returns
 * derived data.
 */

export function extractBodyText(part: GmailMessagePart | undefined): string {
  if (part === undefined) return '';
  if (part.body?.data !== undefined) {
    const raw = Buffer.from(part.body.data, 'base64url').toString('utf-8');
    if (part.mimeType === 'text/plain') return raw.slice(0, 30_000);
    if (part.mimeType === 'text/html') {
      return raw
        .replaceAll(/<[^>]+>/g, ' ')
        .replaceAll(/\s{2,}/g, ' ')
        .trim()
        .slice(0, 30_000);
    }
  }
  for (const p of part.parts ?? []) {
    const text = extractBodyText(p);
    if (text.length > 0) return text;
  }
  return '';
}

export function extractAttachmentNames(part: GmailMessagePart | undefined): string[] {
  if (part === undefined) return [];
  const fromParts = (part.parts ?? []).flatMap((p) => extractAttachmentNames(p));
  if (
    part.filename !== undefined &&
    part.filename.length > 0 &&
    part.body?.attachmentId !== undefined
  ) {
    return [part.filename, ...fromParts];
  }
  return fromParts;
}

export function header(headers: GmailHeader[] | undefined, name: string): string | undefined {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

/**
 * Walk the Gmail MIME tree and return the first text/html part body, decoded.
 * Returns null if the message has no HTML representation.
 */
export function extractHtmlPart(part: GmailMessagePart | undefined): string | null {
  if (part === undefined) return null;
  if (part.mimeType === 'text/html' && part.body?.data !== undefined) {
    return Buffer.from(part.body.data, 'base64url').toString('utf-8');
  }
  for (const child of part.parts ?? []) {
    const html = extractHtmlPart(child);
    if (html !== null) return html;
  }
  return null;
}

/**
 * Walk the MIME tree and return the first text/plain part body, decoded.
 */
export function extractTextPart(part: GmailMessagePart | undefined): string | null {
  if (part === undefined) return null;
  if (part.mimeType === 'text/plain' && part.body?.data !== undefined) {
    return Buffer.from(part.body.data, 'base64url').toString('utf-8');
  }
  for (const child of part.parts ?? []) {
    const text = extractTextPart(child);
    if (text !== null) return text;
  }
  return null;
}

/**
 * Flatten the MIME tree into a leaf-list. Used to enumerate attachments.
 */
export function flattenParts(part: GmailMessagePart | undefined): GmailMessagePart[] {
  if (part === undefined) return [];
  if (part.parts === undefined || part.parts.length === 0) return [part];
  return part.parts.flatMap((p) => flattenParts(p));
}
