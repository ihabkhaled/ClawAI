export function publicationExcerpt(markdown: string): string {
  return markdown
    .replace(/^---[\s\S]*?---\s*/u, '')
    .replaceAll(/^#{1,6}\s+.*$/gmu, '')
    .replaceAll(/```[\s\S]*?```/gu, '')
    .replaceAll(/!?\[([^\]]*)\]\([^)]*\)/gu, '$1')
    .replaceAll(/https?:\/\/\S+/gu, '')
    .replaceAll(/[>*_`~]/gu, '')
    .replaceAll(/\s+/gu, ' ')
    .trim()
    .slice(0, 280);
}
