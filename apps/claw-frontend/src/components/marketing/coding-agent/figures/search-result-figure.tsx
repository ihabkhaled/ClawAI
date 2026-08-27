/**
 * Step two: what the right result looks like in the list.
 *
 * The check mark stands for the Marketplace's verified-publisher badge, which
 * is the one signal that separates the real extension from a lookalike. It is
 * drawn rather than described because that is what the reader has to recognise
 * on screen.
 */
export function SearchResultFigure(): React.ReactElement {
  return (
    <svg viewBox="0 0 320 150" className="editorial-figure__canvas" aria-hidden="true">
      <rect x="0.5" y="0.5" width="319" height="149" className="editorial-figure__frame" />

      <rect x="16" y="16" width="288" height="22" className="editorial-figure__field" />
      <text x="26" y="31" className="editorial-figure__typed">
        ClawAI
      </text>

      <rect x="16" y="52" width="288" height="48" className="editorial-figure__selected" />
      <rect x="26" y="62" width="28" height="28" className="editorial-figure__accent" />
      <text x="62" y="74" className="editorial-figure__label">
        ClawAI Coding Agent
      </text>
      <text x="62" y="90" className="editorial-figure__meta">
        ClawAI
      </text>
      <path d="M172 84 l4 4 l8 -9" className="editorial-figure__tick" />

      <rect x="16" y="110" width="288" height="24" className="editorial-figure__panel" />
    </svg>
  );
}
