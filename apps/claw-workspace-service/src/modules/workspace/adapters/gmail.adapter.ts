import { Injectable, Logger } from '@nestjs/common';

import {
  GMAIL_API_BASE,
  GMAIL_SYNC_MESSAGE_LIMIT,
  GMAIL_USER_ENDPOINT,
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
  HEALTH_CHECK_TIMEOUT_MS,
  OAUTH_PROBE_INVALID_CODE,
  OAUTH_PROBE_INVALID_REDIRECT_URI,
} from '../../../common/constants/workspace.constants';
import { OAuthProbeOutcome } from '../enums/oauth-probe-outcome.enum';
import { probeOAuthAppCredentials } from '../utilities/oauth-app-probe.utility';
import { buildOAuthErrorMessage } from '../utilities/oauth-error.utility';
import { sanitiseHtml } from '../../../common/utilities/html-sanitiser.utility';
import { uploadInternal } from '../../../common/utilities/file-service-client.utility';
import { AppConfig } from '../../../app/config/app.config';
import { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { AdapterAppCredentials, WorkspaceAdapter } from './workspace-adapter.interface';
import type {
  GmailHeader,
  GmailMessage,
  GmailMessageListResponse,
  GmailMessagePart,
  GoogleTokenResponse,
} from '../types/gmail-api.types';
import type {
  AdapterCapabilities,
  HealthCheckResult,
  LiveObjectDetails,
  OAuthTokenSet,
  SyncedObject,
  SyncResult,
  WriteActionResult,
} from '../types/workspace.types';

@Injectable()
export class GmailAdapter implements WorkspaceAdapter {
  private readonly logger = new Logger(GmailAdapter.name);

  async healthCheck(accessToken: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${GMAIL_API_BASE}/users/${GMAIL_USER_ENDPOINT}/profile`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      const latencyMs = Date.now() - start;
      if (response.ok) {
        return { status: WorkspaceConnectorStatus.CONNECTED, latencyMs };
      }
      if (response.status === 401) {
        return {
          status: WorkspaceConnectorStatus.DISCONNECTED,
          latencyMs,
          errorMessage: 'Unauthorized',
        };
      }
      return {
        status: WorkspaceConnectorStatus.DEGRADED,
        latencyMs,
        errorMessage: `HTTP ${response.status}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Gmail health check failed: ${message}`);
      return {
        status: WorkspaceConnectorStatus.DISCONNECTED,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async syncObjects(accessToken: string, deltaToken?: string): Promise<SyncResult> {
    if (deltaToken !== undefined && deltaToken.length > 0) {
      const deltaResult = await this.syncObjectsWithHistory(accessToken, deltaToken);
      if (deltaResult !== null) {
        return deltaResult;
      }
      this.logger.warn('Gmail historyId stale or invalid — falling back to full list');
    }
    const list = await this.listRecentMessages(accessToken);
    const objects: SyncedObject[] = [];
    for (const ref of list.slice(0, GMAIL_SYNC_MESSAGE_LIMIT)) {
      try {
        const full = await this.fetchMessage(accessToken, ref.id);
        objects.push(this.mapMessageToSynced(full));
      } catch (error) {
        this.logger.warn(`Gmail message fetch failed id=${ref.id}: ${String(error)}`);
      }
    }
    const newHistoryId = await this.fetchCurrentHistoryId(accessToken);
    return {
      objectsFound: list.length,
      objectsSynced: objects.length,
      objectsFailed: list.length - objects.length,
      deltaTokenOut: newHistoryId ?? new Date().toISOString(),
      objects,
    };
  }

  /**
   * Delta-mode sync using Gmail `users.history.list?startHistoryId=<last>`.
   * Returns null to signal "cursor invalid, caller must fall back to full poll".
   */
  private async syncObjectsWithHistory(
    accessToken: string,
    startHistoryId: string,
  ): Promise<SyncResult | null> {
    try {
      const response = await fetch(
        `${GMAIL_API_BASE}/users/${GMAIL_USER_ENDPOINT}/history?startHistoryId=${encodeURIComponent(startHistoryId)}&historyTypes=messageAdded&historyTypes=labelAdded`,
        { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
      );
      if (response.status === 404 || response.status === 410) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Gmail history failed: HTTP ${response.status}`);
      }
      const data = (await response.json()) as {
        history?: Array<{
          id: string;
          messagesAdded?: Array<{ message: { id: string; threadId: string } }>;
          messages?: Array<{ id: string; threadId: string }>;
        }>;
        historyId?: string;
      };

      const messageIds = new Set<string>();
      for (const entry of data.history ?? []) {
        for (const added of entry.messagesAdded ?? []) {
          messageIds.add(added.message.id);
        }
        for (const msg of entry.messages ?? []) {
          messageIds.add(msg.id);
        }
      }

      const ids = [...messageIds].slice(0, GMAIL_SYNC_MESSAGE_LIMIT);
      const objects: SyncedObject[] = [];
      for (const id of ids) {
        try {
          const full = await this.fetchMessage(accessToken, id);
          objects.push(this.mapMessageToSynced(full));
        } catch (error) {
          this.logger.warn(`Gmail history fetch failed id=${id}: ${String(error)}`);
        }
      }

      return {
        objectsFound: ids.length,
        objectsSynced: objects.length,
        objectsFailed: ids.length - objects.length,
        deltaTokenOut: data.historyId ?? startHistoryId,
        objects,
      };
    } catch (error) {
      this.logger.warn(`Gmail history delta failed: ${String(error)}`);
      return null;
    }
  }

  private async fetchCurrentHistoryId(accessToken: string): Promise<string | undefined> {
    try {
      const response = await fetch(`${GMAIL_API_BASE}/users/${GMAIL_USER_ENDPOINT}/profile`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      });
      if (!response.ok) {
        return undefined;
      }
      const data = (await response.json()) as { historyId?: string };
      return data.historyId;
    } catch {
      return undefined;
    }
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier: string | undefined,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Gmail OAuth requires clientId and clientSecret');
    }
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      code,
      redirect_uri: redirectUri,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    });
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(await buildOAuthErrorMessage('Gmail', 'token exchange', response));
    }
    const data = (await response.json()) as GoogleTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async refreshTokens(
    refreshToken: string,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Gmail refresh requires clientId and clientSecret');
    }
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      refresh_token: refreshToken,
    });
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(await buildOAuthErrorMessage('Gmail', 'token refresh', response));
    }
    const data = (await response.json()) as GoogleTokenResponse;
    return this.normalizeTokenResponse(data);
  }

  async validateOAuthAppConfig(appCredentials: AdapterAppCredentials): Promise<HealthCheckResult> {
    if (!appCredentials.clientId || !appCredentials.clientSecret) {
      throw new Error('Gmail OAuth probe requires clientId and clientSecret');
    }
    const form = new URLSearchParams({
      client_id: appCredentials.clientId,
      client_secret: appCredentials.clientSecret,
      grant_type: 'authorization_code',
      code: OAUTH_PROBE_INVALID_CODE,
      redirect_uri: OAUTH_PROBE_INVALID_REDIRECT_URI,
    });
    return probeOAuthAppCredentials({
      tokenUrl: GOOGLE_TOKEN_URL,
      requestBuilder: () => ({
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: form.toString(),
      }),
      interpret: (payload, status) => {
        const data = payload as { error?: string } | null;
        const error = data?.error;
        if (error === 'invalid_grant' || error === 'redirect_uri_mismatch') {
          return OAuthProbeOutcome.CREDENTIALS_OK;
        }
        if (error === 'invalid_client' || status === 401) {
          return OAuthProbeOutcome.CREDENTIALS_BAD;
        }
        return OAuthProbeOutcome.UNKNOWN;
      },
    });
  }

  getCapabilities(): AdapterCapabilities {
    return {
      supportsOAuth: true,
      supportsPat: false,
      supportsDeltaSync: true,
      supportsWebhooks: false,
      objectTypes: ['EMAIL'],
    };
  }

  getAuthorizationBaseUrl(): string {
    return GOOGLE_AUTH_URL;
  }

  getDefaultScopes(): string[] {
    // NOTE: do NOT request gmail.metadata alongside gmail.readonly.
    // Gmail applies the most restrictive scope to any given request, and
    // messages.list with `q=` search queries is forbidden under
    // gmail.metadata (which only allows header-level access). Granting
    // both scopes causes 403 on message list.
    return [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
    ];
  }

  getExtraAuthParams(): Record<string, string> {
    return { access_type: 'offline', prompt: 'consent' };
  }

  async fetchObjectDetails(
    accessToken: string,
    externalId: string,
    objectType: string,
  ): Promise<LiveObjectDetails | null> {
    if (objectType !== WorkspaceObjectType.EMAIL) {
      return null;
    }
    try {
      const full = await this.fetchMessage(accessToken, externalId);
      return this.mapMessageToLive(full);
    } catch (error) {
      if ((error as { status?: number } | null)?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  private normalizeTokenResponse(data: GoogleTokenResponse): OAuthTokenSet {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt:
        data.expires_in !== undefined && data.expires_in !== null
          ? new Date(Date.now() + data.expires_in * 1000)
          : undefined,
      scopes: data.scope !== undefined ? data.scope.split(' ').filter(Boolean) : [],
    };
  }

  private async listRecentMessages(
    accessToken: string,
  ): Promise<Array<{ id: string; threadId: string }>> {
    // NOTE: intentionally NOT using `q=newer_than:30d` — that query is
    // forbidden under gmail.metadata scope (returns 403). Use labelIds
    // instead, which works under both metadata and readonly.
    const response = await fetch(
      `${GMAIL_API_BASE}/users/${GMAIL_USER_ENDPOINT}/messages?maxResults=${String(GMAIL_SYNC_MESSAGE_LIMIT)}&labelIds=INBOX`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
    );
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Gmail list failed: HTTP ${response.status}${body ? ` — ${body.slice(0, 200)}` : ''}`,
      );
    }
    const data = (await response.json()) as GmailMessageListResponse;
    return data.messages ?? [];
  }

  private async fetchMessage(accessToken: string, id: string): Promise<GmailMessage> {
    const response = await fetch(
      `${GMAIL_API_BASE}/users/${GMAIL_USER_ENDPOINT}/messages/${id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
    );
    if (!response.ok) {
      const err = new Error(`Gmail get failed: HTTP ${response.status}`) as Error & {
        status: number;
      };
      err.status = response.status;
      throw err;
    }
    return (await response.json()) as GmailMessage;
  }

  private extractBodyText(part: GmailMessagePart | undefined): string {
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
      const text = this.extractBodyText(p);
      if (text.length > 0) return text;
    }
    return '';
  }

  private extractAttachmentNames(part: GmailMessagePart | undefined): string[] {
    if (part === undefined) return [];
    const fromParts = (part.parts ?? []).flatMap((p) => this.extractAttachmentNames(p));
    if (
      part.filename !== undefined &&
      part.filename.length > 0 &&
      part.body?.attachmentId !== undefined
    ) {
      return [part.filename, ...fromParts];
    }
    return fromParts;
  }

  private header(headers: GmailHeader[] | undefined, name: string): string | undefined {
    return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
  }

  private mapMessageToSynced(message: GmailMessage): SyncedObject {
    const headers = message.payload?.headers;
    const subject = this.header(headers, 'Subject') ?? '(no subject)';
    const from = this.header(headers, 'From');
    const to = this.header(headers, 'To');
    const cc = this.header(headers, 'Cc');
    const internal = message.internalDate ? new Date(Number(message.internalDate)) : undefined;
    const bodyText = this.extractBodyText(message.payload);
    return {
      externalId: message.id,
      type: WorkspaceObjectType.EMAIL,
      title: subject,
      content: bodyText.length > 0 ? bodyText : (message.snippet ?? undefined),
      url: `https://mail.google.com/mail/u/0/#inbox/${message.threadId}`,
      authorId: from,
      metadata: {
        threadId: message.threadId,
        labelIds: message.labelIds,
        from,
        to,
        cc,
        snippet: message.snippet,
      },
      externalCreatedAt: internal,
      externalUpdatedAt: internal,
    };
  }

  private mapMessageToLive(message: GmailMessage): LiveObjectDetails {
    const headers = message.payload?.headers;
    const subject = this.header(headers, 'Subject') ?? '(no subject)';
    const from = this.header(headers, 'From');
    const to = this.header(headers, 'To');
    const cc = this.header(headers, 'Cc');
    const internal = message.internalDate ? new Date(Number(message.internalDate)) : null;
    const bodyText = this.extractBodyText(message.payload);
    const attachments = this.extractAttachmentNames(message.payload);
    return {
      externalId: message.id,
      title: subject,
      content: bodyText.length > 0 ? bodyText : (message.snippet ?? null),
      url: `https://mail.google.com/mail/u/0/#inbox/${message.threadId}`,
      authorId: from ?? null,
      externalCreatedAt: internal,
      externalUpdatedAt: internal,
      metadata: {
        threadId: message.threadId,
        labelIds: message.labelIds,
        from,
        to,
        cc,
        snippet: message.snippet,
        attachments,
      },
    };
  }

  supportsWrite(): boolean {
    return true;
  }

  async executeWriteAction(
    accessToken: string,
    actionType: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    if (actionType === 'SEND_EMAIL' || actionType === 'REPLY_EMAIL') {
      return this.sendEmail(accessToken, payload, actionType === 'REPLY_EMAIL');
    }
    return {
      success: false,
      errorMessage: `Gmail adapter: unsupported action type ${actionType}`,
    };
  }

  private async sendEmail(
    accessToken: string,
    payload: Record<string, unknown>,
    isReply: boolean,
  ): Promise<WriteActionResult> {
    const to = typeof payload['to'] === 'string' ? payload['to'] : null;
    const subject = typeof payload['subject'] === 'string' ? payload['subject'] : null;
    const body = typeof payload['body'] === 'string' ? payload['body'] : null;
    const threadId =
      isReply && typeof payload['threadId'] === 'string' ? payload['threadId'] : undefined;
    if (to === null || subject === null || body === null) {
      return {
        success: false,
        errorMessage: 'Gmail send requires {to, subject, body} fields in payload',
      };
    }

    const rfc822 = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body,
    ].join('\r\n');
    const raw = Buffer.from(rfc822, 'utf-8').toString('base64url');

    const response = await fetch(`${GMAIL_API_BASE}/users/${GMAIL_USER_ENDPOINT}/messages/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw, ...(threadId !== undefined ? { threadId } : {}) }),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        success: false,
        errorMessage: `Gmail send failed: HTTP ${response.status} ${errorText.slice(0, 200)}`,
      };
    }
    const data = (await response.json()) as { id?: string; threadId?: string };
    return {
      success: true,
      externalId: data.id,
      url:
        data.threadId !== undefined
          ? `https://mail.google.com/mail/u/0/#inbox/${data.threadId}`
          : undefined,
      metadata: { threadId: data.threadId },
    };
  }

  // ─── Stream 22: HTML rendering + attachment extraction ──────────

  /**
   * Walk the Gmail MIME tree and return the first text/html part body, decoded.
   * Returns null if the message has no HTML representation.
   */
  extractHtmlPart(part: GmailMessagePart | undefined): string | null {
    if (part === undefined) return null;
    if (part.mimeType === 'text/html' && part.body?.data !== undefined) {
      return Buffer.from(part.body.data, 'base64url').toString('utf-8');
    }
    for (const child of part.parts ?? []) {
      const html = this.extractHtmlPart(child);
      if (html !== null) return html;
    }
    return null;
  }

  /**
   * Walk the MIME tree and return the first text/plain part body, decoded.
   */
  extractTextPart(part: GmailMessagePart | undefined): string | null {
    if (part === undefined) return null;
    if (part.mimeType === 'text/plain' && part.body?.data !== undefined) {
      return Buffer.from(part.body.data, 'base64url').toString('utf-8');
    }
    for (const child of part.parts ?? []) {
      const text = this.extractTextPart(child);
      if (text !== null) return text;
    }
    return null;
  }

  /**
   * Flatten the MIME tree into a leaf-list. Used to enumerate attachments.
   */
  flattenParts(part: GmailMessagePart | undefined): GmailMessagePart[] {
    if (part === undefined) return [];
    if (part.parts === undefined || part.parts.length === 0) return [part];
    return part.parts.flatMap((p) => this.flattenParts(p));
  }

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
  }): Promise<Array<{
    fileServiceFileId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    partId: string;
    extractedText: string | null;
  }>> {
    const config = AppConfig.get();
    if (!config.WORKSPACE_GMAIL_FETCH_ATTACHMENTS) return [];
    if (input.payload === undefined) return [];
    const refs: Array<{
      fileServiceFileId: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      partId: string;
      extractedText: string | null;
    }> = [];
    for (const part of this.flattenParts(input.payload)) {
      if (
        part.body?.attachmentId === undefined ||
        part.filename === undefined ||
        part.filename.length === 0 ||
        part.body.size === undefined
      ) {
        continue;
      }
      if (part.body.size > config.WORKSPACE_GMAIL_MAX_ATTACHMENT_BYTES) {
        this.logger.warn(
          `fetchAndPersistAttachments: skipping oversize attachment ${part.filename} (${String(part.body.size)} bytes)`,
        );
        continue;
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
        // Stream 22.3 → 30 — extract text from common text-able types so the
        // email's content field (which is the embedding source for Stream 30
        // semantic search) carries the attachment text, not just the body.
        const extractedText = this.extractAttachmentText(part.mimeType, part.filename, data);
        refs.push({
          fileServiceFileId: fileId,
          filename: part.filename,
          mimeType: part.mimeType ?? 'application/octet-stream',
          sizeBytes: data.length,
          partId: part.partId ?? '',
          extractedText,
        });
      } catch (error) {
        this.logger.warn(
          `fetchAndPersistAttachments: failed for ${part.filename} — ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
    return refs;
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
  }): Promise<{
    renderedHtml: string | null;
    renderedText: string | null;
    /** Stream 22.3 → 30: concatenated attachment text for inclusion in the
     * indexable content of the parent EMAIL WorkspaceObject. */
    indexableAttachmentText: string;
    attachmentRefs: Array<{
      fileServiceFileId: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      partId: string;
      extractedText: string | null;
    }>;
  }> {
    const rawHtml = this.extractHtmlPart(input.message.payload);
    const renderedHtml = rawHtml === null ? null : sanitiseHtml(rawHtml);
    const renderedText = this.extractTextPart(input.message.payload);
    const attachmentRefs = await this.fetchAndPersistAttachments({
      accessToken: input.accessToken,
      messageId: input.message.id,
      userId: input.userId,
      payload: input.message.payload,
    });
    const indexableAttachmentText = attachmentRefs
      .filter((r): r is typeof r & { extractedText: string } => r.extractedText !== null)
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
