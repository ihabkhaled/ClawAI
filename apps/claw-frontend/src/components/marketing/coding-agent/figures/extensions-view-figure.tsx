/**
 * Step one: where the Extensions view lives.
 *
 * The literal words rendered inside — "Extensions" — quote VS Code's own
 * interface rather than speak in ClawAI's voice, so they are not translated:
 * a reader looking for a button labelled "Extensions" needs to see that word,
 * not a rendering of it in their language. The accessible name comes from the
 * step title beside it, which is translated.
 */
export function ExtensionsViewFigure(): React.ReactElement {
  return (
    <svg viewBox="0 0 320 150" className="editorial-figure__canvas" aria-hidden="true">
      <rect x="0.5" y="0.5" width="319" height="149" className="editorial-figure__frame" />
      <rect x="0.5" y="0.5" width="40" height="149" className="editorial-figure__panel" />

      {[26, 52, 78].map((y) => (
        <rect key={y} x="12" y={y} width="16" height="16" className="editorial-figure__muted" />
      ))}
      <rect x="12" y="104" width="16" height="16" className="editorial-figure__accent" />
      <rect x="0.5" y="100" width="3" height="24" className="editorial-figure__accent" />

      <text x="52" y="34" className="editorial-figure__label">
        Extensions
      </text>
      <rect x="52" y="46" width="240" height="20" className="editorial-figure__muted" />
      {[76, 98, 120].map((y) => (
        <rect key={y} x="52" y={y} width="240" height="14" className="editorial-figure__panel" />
      ))}
    </svg>
  );
}
