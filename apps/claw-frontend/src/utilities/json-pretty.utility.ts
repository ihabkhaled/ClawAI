// Phase 8 UI transparency — produces a stable, pretty-printed JSON
// representation suitable for the MarkdownRenderer code block. Safe
// against circular references by swapping repeat entries for "[Circular]"
// so the inspector doesn't crash when an LLM returns a self-referential
// shape (rare, but defensive).

export function prettyJson(value: unknown, indent = 2): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(
    value,
    (_key, v: unknown) => {
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v as object)) {
          return '[Circular]';
        }
        seen.add(v as object);
      }
      return v;
    },
    indent,
  );
}

export function toMarkdownJsonBlock(value: unknown): string {
  return `\`\`\`json\n${prettyJson(value)}\n\`\`\``;
}
