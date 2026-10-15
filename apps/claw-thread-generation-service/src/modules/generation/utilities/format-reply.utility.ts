/** A model sometimes wraps the whole article in one ```markdown fence; the fence is not part of the text. */
export function escapeFormatReply(markdown: string): string {
  const fenced = /^\s*```(?:markdown|md)?\s*\n([\s\S]*?)\n?```\s*$/iu.exec(markdown);
  return (fenced?.[1] ?? markdown).trim();
}
