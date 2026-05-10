import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import {
  GMAIL_API_BASE,
  HEALTH_CHECK_TIMEOUT_MS,
} from '../../../common/constants/workspace.constants';
import { uploadInternal } from '../../../common/utilities/file-service-client.utility';
import { sanitiseHtml } from '../../../common/utilities/html-sanitiser.utility';
import { extractHtmlPart, extractTextPart, flattenParts } from './gmail-message-parts.utility';
import type { GmailMessage, GmailMessagePart } from '../types/gmail-api.types';
import type { GmailAttachmentRef, GmailRichMetadata } from '../types/gmail-attachment.types';

@Injectable()
export class GmailAttachmentHelper {
  private readonly logger = new Logger(GmailAttachmentHelper.name);

  /**
   * Persist Gmail attachments to claw-file-service via the service-token
   * upload-internal endpoint. Returns the per-attachment refs that the caller
   * stores on `WorkspaceObject.metadata.attachmentRefs`. Skips attachments
   * larger than `WORKSPACE_GMAIL_MAX_ATTACHMENT_BYTES`.
   */
  async fetchAndPersistAttachments(input: {
    accessToken: string;
    messageId: string;
    userId: string;
    payload: GmailMessagePart | undefined;
  }): Promise<GmailAttachmentRef[]> {
    const config = AppConfig.get();
    if (!config.WORKSPACE_GMAIL_FETCH_ATTACHMENTS) return [];
    if (input.payload === undefined) return [];
    const refs: GmailAttachmentRef[] = [];
    for (const part of flattenParts(input.payload)) {
      const ref = await this.tryPersistOne(
        input,
        part,
        config.WORKSPACE_GMAIL_MAX_ATTACHMENT_BYTES,
      );
      if (ref !== null) refs.push(ref);
    }
    return refs;
  }

  private async tryPersistOne(
    input: { accessToken: string; messageId: string; userId: string },
    part: GmailMessagePart,
    maxBytes: number,
  ): Promise<GmailAttachmentRef | null> {
    if (
      part.body?.attachmentId === undefined ||
      part.filename === undefined ||
      part.filename.length === 0 ||
      part.body.size === undefined
    ) {
      return null;
    }
    if (part.body.size > maxBytes) {
      this.logger.warn(
        `tryPersistOne: skipping oversize attachment ${part.filename} (${String(part.body.size)} bytes)`,
      );
      return null;
    }
    try {
      const data = await this.fetchAttachmentData(
        input.accessToken,
        input.messageId,
        part.body.attachmentId,
      );
      const fileId = await uploadInternal({
        userId: input.userId,
        filename: part.filename,
        mimeType: part.mimeType ?? 'application/octet-stream',
        content: data,
      });
      const extractedText = this.extractAttachmentText(part.mimeType, part.filename, data);
      return {
        fileServiceFileId: fileId,
        filename: part.filename,
        mimeType: part.mimeType ?? 'application/octet-stream',
        sizeBytes: data.length,
        partId: part.partId ?? '',
        extractedText,
      };
    } catch (error) {
      this.logger.warn(
        `tryPersistOne: failed for ${part.filename} — ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  /**
   * Build a "rich-rendered" metadata block for a Gmail message — sanitised HTML
   * + plaintext + (optional) attachment refs. Caller stores this on
   * `WorkspaceObject.metadata` alongside the existing fields.
   */
  async renderMessageRichMetadata(input: {
    accessToken: string;
    message: GmailMessage;
    userId: string;
  }): Promise<GmailRichMetadata> {
    const rawHtml = extractHtmlPart(input.message.payload);
    const renderedHtml = rawHtml === null ? null : sanitiseHtml(rawHtml);
    const renderedText = extractTextPart(input.message.payload);
    const attachmentRefs = await this.fetchAndPersistAttachments({
      accessToken: input.accessToken,
      messageId: input.message.id,
      userId: input.userId,
      payload: input.message.payload,
    });
    const indexableAttachmentText = attachmentRefs
      .filter((r): r is GmailAttachmentRef & { extractedText: string } => r.extractedText !== null)
      .map((r) => `[${r.filename}]\n${r.extractedText}`)
      .join('\n\n')
      .slice(0, 20_000);
    return { renderedHtml, renderedText, indexableAttachmentText, attachmentRefs };
  }

  /**
   * Stream 22.3 — extract plain text from a Gmail attachment buffer for
   * inclusion in the email's indexable content. Only handles text-decodable
   * types here; binary types like PDF/DOCX route through file-service's
   * existing text-extraction pipeline (deferred — beyond this bridge).
   */
  private extractAttachmentText(
    mimeType: string | undefined,
    filename: string,
    data: Buffer,
  ): string | null {
    const TEXT_LIKE = /^text\/(plain|csv|markdown|x-markdown|html)$/i;
    const NAME_LIKE = /\.(txt|md|csv|json|log|yaml|yml)$/i;
    const isTextLike =
      (mimeType !== undefined && TEXT_LIKE.test(mimeType)) || NAME_LIKE.test(filename);
    if (!isTextLike) return null;
    try {
      return data.toString('utf-8').slice(0, 8_000);
    } catch (error) {
      this.logger.warn(`extractAttachmentText: failed for ${filename} — ${String(error)}`);
      return null;
    }
  }

  private async fetchAttachmentData(
    accessToken: string,
    messageId: string,
    attachmentId: string,
  ): Promise<Buffer> {
    const url = `${GMAIL_API_BASE}/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS * 6),
    });
    if (!response.ok) {
      throw new Error(`Gmail attachment fetch ${String(response.status)}`);
    }
    const body = (await response.json()) as { data?: string };
    if (body.data === undefined) {
      throw new Error('Gmail attachment fetch returned no data');
    }
    return Buffer.from(body.data, 'base64url');
  }
}
