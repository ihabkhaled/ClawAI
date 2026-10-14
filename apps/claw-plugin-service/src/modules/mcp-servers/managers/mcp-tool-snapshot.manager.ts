import { Injectable } from '@nestjs/common';

import { ToolSkipReason } from '../../../common/enums/tool-skip-reason.enum';
import { isPlainRecord } from '../../../common/utilities/is-plain-record.utility';
import { SCHEMA_FORBIDDEN_KEYS } from '../../catalog/constants/catalog.constants';
import { computeManifestHash } from '../../catalog/utilities/compute-manifest-hash.utility';
import { checkJsonSchemaSubset } from '../../catalog/utilities/json-schema-subset.utility';
import {
  MCP_MAX_TOOLS,
  MCP_REMOTE_TOOL_NAME_PATTERN,
  MCP_SKIPPED_NAME_DISPLAY_MAX,
  MCP_TOOL_DESCRIPTION_MAX,
} from '../constants/mcp.constants';
import {
  type SkippedTool,
  type SnapshotTool,
  type ToolSnapshot,
} from '../types/mcp-tool-snapshot.types';
import { stripHostileText } from '../utilities/strip-hostile-text.utility';
import { toLocalToolName } from '../utilities/to-local-tool-name.utility';

/**
 * Turns the tools a server listed into the snapshot the user reviews and the runtime pins.
 * Each entry is hostile until proven otherwise: the name must be plain, the text is cleaned
 * and capped, the input schema must sit inside the same safe subset manifests are held to, and
 * a tool that fails any check is skipped (and reported) rather than repaired. Risk is not
 * decided here: every tool starts as WRITE, whatever hints the server attaches.
 */
@Injectable()
export class McpToolSnapshotManager {
  build(rawTools: readonly unknown[]): ToolSnapshot {
    const tools: SnapshotTool[] = [];
    const skipped: SkippedTool[] = [];
    const seenLocal = new Set<string>();
    const seenRemote = new Set<string>();
    let ignored = 0;
    for (const raw of rawTools) {
      if (tools.length >= MCP_MAX_TOOLS) {
        ignored += 1;
        continue;
      }
      const outcome = this.vet(raw, seenLocal, seenRemote);
      if ('reason' in outcome) {
        skipped.push(outcome);
      } else {
        seenLocal.add(outcome.localName);
        seenRemote.add(outcome.name);
        tools.push(outcome);
      }
    }
    return { tools, skipped, ignored, toolsHash: this.hashOf(tools) };
  }

  private vet(
    raw: unknown,
    seenLocal: ReadonlySet<string>,
    seenRemote: ReadonlySet<string>,
  ): SnapshotTool | SkippedTool {
    if (!isPlainRecord(raw)) return { name: '(unnamed)', reason: ToolSkipReason.MALFORMED };
    const name = raw['name'];
    if (
      typeof name !== 'string' ||
      !MCP_REMOTE_TOOL_NAME_PATTERN.test(name) ||
      SCHEMA_FORBIDDEN_KEYS.includes(name)
    ) {
      return { name: this.displayName(name), reason: ToolSkipReason.BAD_NAME };
    }
    const localName = toLocalToolName(name);
    if (localName === null) return { name, reason: ToolSkipReason.BAD_NAME };
    if (seenLocal.has(localName) || seenRemote.has(name)) {
      return { name, reason: ToolSkipReason.NAME_COLLISION };
    }
    const description = raw['description'];
    if (description !== undefined && typeof description !== 'string') {
      return { name, reason: ToolSkipReason.BAD_DESCRIPTION };
    }
    const inputSchema = raw['inputSchema'];
    if (!this.isAcceptableSchema(inputSchema)) return { name, reason: ToolSkipReason.BAD_SCHEMA };
    const clean = stripHostileText(description ?? '', true)
      .trim()
      .slice(0, MCP_TOOL_DESCRIPTION_MAX);
    const schemaHash = computeManifestHash({ name, description: clean, inputSchema });
    return { name, localName, description: clean, inputSchema, schemaHash };
  }

  private isAcceptableSchema(schema: unknown): schema is Record<string, unknown> {
    return (
      isPlainRecord(schema) &&
      schema['type'] === 'object' &&
      checkJsonSchemaSubset(schema).length === 0
    );
  }

  private displayName(name: unknown): string {
    if (typeof name !== 'string') return '(unnamed)';
    const shown = stripHostileText(name, false).slice(0, MCP_SKIPPED_NAME_DISPLAY_MAX);
    return shown === '' ? '(unnamed)' : shown;
  }

  private hashOf(tools: readonly SnapshotTool[]): string {
    const pairs = tools.map((tool) => [tool.name, tool.schemaHash]);
    pairs.sort(([left = ''], [right = '']) => left.localeCompare(right));
    return computeManifestHash(pairs);
  }
}
