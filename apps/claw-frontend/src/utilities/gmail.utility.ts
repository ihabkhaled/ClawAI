import type {
  GmailAttachmentRef,
  GmailMessageMetadata,
  GmailRichMetadata,
} from '../types/gmail.types';

export function extractGmailMetadata(metadata: Record<string, unknown>): GmailMessageMetadata {
  const labelIds = Array.isArray(metadata['labelIds']) ? (metadata['labelIds'] as string[]) : [];

  return {
    subject: typeof metadata['subject'] === 'string' ? metadata['subject'] : '',
    from: typeof metadata['from'] === 'string' ? metadata['from'] : '',
    to: typeof metadata['to'] === 'string' ? metadata['to'] : '',
    threadId: typeof metadata['threadId'] === 'string' ? metadata['threadId'] : '',
    labelIds,
    isUnread: labelIds.includes('UNREAD'),
    snippet: typeof metadata['snippet'] === 'string' ? metadata['snippet'] : '',
  };
}

/**
 * Stream 22 — extract the rich metadata blob (renderedHtml + attachmentRefs)
 * the Gmail adapter writes onto WorkspaceObject.metadata.
 */
export function extractGmailRichMetadata(metadata: Record<string, unknown>): GmailRichMetadata {
  const refs = Array.isArray(metadata['attachmentRefs'])
    ? (metadata['attachmentRefs'] as Array<Record<string, unknown>>)
    : [];
  const attachmentRefs: GmailAttachmentRef[] = refs.map((r) => ({
    fileServiceFileId: typeof r['fileServiceFileId'] === 'string' ? r['fileServiceFileId'] : '',
    filename: typeof r['filename'] === 'string' ? r['filename'] : '(unnamed)',
    mimeType: typeof r['mimeType'] === 'string' ? r['mimeType'] : 'application/octet-stream',
    sizeBytes: typeof r['sizeBytes'] === 'number' ? r['sizeBytes'] : 0,
  }));
  return {
    renderedHtml: typeof metadata['renderedHtml'] === 'string' ? metadata['renderedHtml'] : null,
    renderedText: typeof metadata['renderedText'] === 'string' ? metadata['renderedText'] : null,
    attachmentRefs,
  };
}

/**
 * Stream 22 — replace `<img>` tags with neutral placeholders to defeat
 * tracking pixels by default. Mirrors the server-side `stripImages`
 * utility output so the toggle behaviour is symmetric.
 */
export function clientStripImages(html: string): string {
  return html.replaceAll(
    /<img\b[^>]*>/gi,
    '<span data-claw="image-blocked" style="display:inline-block;padding:2px 6px;background:#eee;color:#666;border-radius:4px">[image hidden]</span>',
  );
}
