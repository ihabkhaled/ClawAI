import { Children, isValidElement, type ReactNode } from 'react';

// Recursively concatenates all text content from a React node tree. Used by
// the markdown <pre> renderer (Phase 4 — Chat UI/UX refactor) to extract the
// raw source of a code block for the copy-to-clipboard button. Falls back to
// an empty string for nullish / boolean nodes — those carry no visible text.
//
// Kept runtime-neutral so the markdown layer can stay a pure renderer with
// no awareness of clipboard semantics. The .ts location respects the FE
// no-hooks-in-tsx rule (utilities must live under src/utilities/).
export function extractTextFromReactNode(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string') {
    return node;
  }
  if (typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((child) => extractTextFromReactNode(child)).join('');
  }
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return Children.toArray(props.children ?? null)
      .map((child) => extractTextFromReactNode(child))
      .join('');
  }
  return '';
}
