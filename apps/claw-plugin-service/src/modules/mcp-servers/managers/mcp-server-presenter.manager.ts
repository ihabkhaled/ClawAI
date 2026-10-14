import { Injectable } from '@nestjs/common';

import { isPlainRecord } from '../../../common/utilities/is-plain-record.utility';
import { NATIVE_TOOL_PREFIX } from '../../catalog/constants/catalog.constants';
import { type ServerRecord, type ServerToolRecord } from '../types/mcp-server.types';
import {
  type McpServerDetailView,
  type McpServerToolView,
  type McpServerView,
} from '../types/mcp-server-view.types';

/** Shapes a stored server for its owner. Never carries a credential, only that one exists. */
@Injectable()
export class McpServerPresenterManager {
  toView(record: ServerRecord): McpServerView {
    return {
      id: record.id,
      slug: record.slug,
      name: record.name,
      url: record.url,
      urlHost: record.urlHost,
      authKind: record.authKind,
      status: record.status,
      hasCredential: record.credential !== null,
      credentialUpdatedAt: record.credential?.updatedAt.toISOString() ?? null,
      toolCount: record.tools.length,
      toolsHash: record.toolsHash,
      serverInfo: this.serverInfoOf(record.serverInfo),
      lastCheckedAt: record.lastCheckedAt?.toISOString() ?? null,
      lastErrorCode: record.lastErrorCode,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  toDetail(record: ServerRecord): McpServerDetailView {
    return {
      ...this.toView(record),
      tools: record.tools.map((tool) => this.toolView(record.slug, tool)),
    };
  }

  nativeName(slug: string, localName: string): string {
    return `${NATIVE_TOOL_PREFIX}_${slug}_${localName}`;
  }

  private toolView(slug: string, tool: ServerToolRecord): McpServerToolView {
    return {
      name: tool.localName,
      nativeName: this.nativeName(slug, tool.localName),
      remoteName: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      riskLevel: tool.riskLevel,
      enabled: tool.enabled,
      consentGranted: tool.consentGranted,
    };
  }

  private serverInfoOf(raw: unknown): { name: string; version: string } | null {
    if (!isPlainRecord(raw)) return null;
    const { name, version } = raw;
    return typeof name === 'string' && typeof version === 'string' ? { name, version } : null;
  }
}
