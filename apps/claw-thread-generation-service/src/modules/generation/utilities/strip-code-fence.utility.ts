// Models often wrap an otherwise valid JSON answer in a ```json fence.
export function stripCodeFence(content: string): string {
  const fenced = /^\s*```(?:json)?\s*\n([\s\S]*?)\n?```\s*$/iu.exec(content);
  return fenced?.[1] ?? content;
}
