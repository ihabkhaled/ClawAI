import type { ThreadSnapshot } from './types/thread-snapshot.types';

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  return typeof value === 'object' && value !== null
    ? Object.fromEntries(
        Object.entries(value)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, nested]) => [key, canonicalValue(nested)]),
      )
    : value;
}

export function exportSnapshotJson(snapshot: ThreadSnapshot): string {
  return JSON.stringify(canonicalValue(snapshot), null, 2);
}

export function exportSnapshotMarkdown(snapshot: ThreadSnapshot): string {
  const trimmedTitle = snapshot.title?.trim() ?? '';
  const title = trimmedTitle.length > 0 ? trimmedTitle : 'Untitled conversation';
  const entries = snapshot.messages.map((message) => {
    const role = message.role === 'USER' ? 'User' : 'Assistant';
    return `## ${role} · ${message.createdAt}\n\n${message.content}`;
  });
  return [
    `# ${title}`,
    '',
    `Source snapshot: \`${snapshot.sha256}\` · ${String(snapshot.messageCount)} messages`,
    '',
    ...entries.flatMap((entry) => [entry, '']),
  ].join('\n');
}

export function exportSnapshotToon(_snapshot: ThreadSnapshot): {
  available: false;
  reason: string;
} {
  return { available: false, reason: 'No verified TOON codec is configured.' };
}
