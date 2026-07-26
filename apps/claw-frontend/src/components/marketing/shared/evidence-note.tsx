import type { EvidenceNoteProps } from '@/types/marketing-editorial.types';

export function EvidenceNote({ label, source, children }: EvidenceNoteProps): React.ReactElement {
  return (
    <aside className="editorial-evidence-note" aria-label={label}>
      <p className="editorial-evidence-note__label">{label}</p>
      <div className="editorial-evidence-note__body">{children}</div>
      {source === undefined ? null : (
        <a className="editorial-evidence-note__source" href={source.href}>
          {source.label}
        </a>
      )}
    </aside>
  );
}
