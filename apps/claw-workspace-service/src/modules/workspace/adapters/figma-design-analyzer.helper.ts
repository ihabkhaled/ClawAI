import { Injectable, Logger } from '@nestjs/common';

import type {
  FigmaDesignAnalysis,
  FigmaDesignFrame,
  FigmaDocumentNode,
  FigmaFileTreeResponse,
} from '../types/figma-api.types';

// v3 round 10 (2026-05-14) — Prompt 09: Figma design analysis pipeline.
//
// Walks the Figma document tree and flattens it into a compact,
// AI-ready summary. The raw Figma file API returns a deeply nested
// recursive structure that's too large to hand to an LLM directly;
// this helper extracts just the structural signal a design-to-story
// AI action needs: page names, frame names, the text content inside
// each frame, and the reusable component names.
//
// Caps (so the analysis never blows past an LLM context window):
//   - MAX_FRAMES frames total
//   - MAX_TEXT_PER_FRAME distinct text snippets per frame
//   - MAX_TEXT_LEN chars per snippet
// When any cap trips, `truncated: true` is set on the result.

const MAX_FRAMES = 60;
const MAX_TEXT_PER_FRAME = 25;
const MAX_TEXT_LEN = 200;
const MAX_COMPONENT_NAMES = 100;

@Injectable()
export class FigmaDesignAnalyzerHelper {
  private readonly logger = new Logger(FigmaDesignAnalyzerHelper.name);

  analyze(fileKey: string, tree: FigmaFileTreeResponse): FigmaDesignAnalysis {
    const frames: FigmaDesignFrame[] = [];
    let truncated = false;
    let pageCount = 0;

    // The document's direct children are CANVAS nodes = Figma pages.
    const pages = tree.document.children ?? [];
    for (const page of pages) {
      pageCount += 1;
      const pageName = page.name;
      const pageFrames = page.children ?? [];
      for (const node of pageFrames) {
        // Only top-level FRAME / COMPONENT / SECTION nodes count as
        // "frames" for story purposes — nested auto-layout frames are
        // walked for text but not listed separately.
        if (
          node.type !== 'FRAME' &&
          node.type !== 'COMPONENT' &&
          node.type !== 'COMPONENT_SET' &&
          node.type !== 'SECTION'
        ) {
          continue;
        }
        if (frames.length >= MAX_FRAMES) {
          truncated = true;
          break;
        }
        const textSnippets = this.collectText(node);
        if (textSnippets.length > MAX_TEXT_PER_FRAME) {
          truncated = true;
        }
        frames.push({
          pageName,
          frameName: node.name,
          textSnippets: textSnippets.slice(0, MAX_TEXT_PER_FRAME),
        });
      }
      if (frames.length >= MAX_FRAMES) {
        truncated = true;
        break;
      }
    }

    const componentEntries = Object.values(tree.components ?? {});
    const componentNames = componentEntries
      .map((c) => c.name)
      .slice(0, MAX_COMPONENT_NAMES);
    if (componentEntries.length > MAX_COMPONENT_NAMES) {
      truncated = true;
    }

    this.logger.debug(
      `analyze: fileKey=${fileKey} pages=${String(pageCount)} frames=${String(frames.length)} components=${String(componentNames.length)} truncated=${String(truncated)}`,
    );

    return {
      fileKey,
      fileName: tree.name,
      version: tree.version,
      pageCount,
      frameCount: frames.length,
      componentCount: componentEntries.length,
      componentNames,
      frames,
      truncated,
    };
  }

  // Depth-first collection of distinct TEXT-node strings under a node.
  private collectText(root: FigmaDocumentNode): string[] {
    const seen = new Set<string>();
    const stack: FigmaDocumentNode[] = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      if (node === undefined) continue;
      if (
        node.type === 'TEXT' &&
        typeof node.characters === 'string' &&
        node.characters.trim().length > 0
      ) {
        const snippet = node.characters.trim().slice(0, MAX_TEXT_LEN);
        seen.add(snippet);
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          stack.push(child);
        }
      }
    }
    return [...seen];
  }
}
