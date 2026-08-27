/**
 * Step three: the Install button, then the one field sign-in asks for.
 *
 * The backend URL is the step people get wrong — they either expect no prompt
 * at all, or assume a self-hosted address is required. Showing the field with
 * a default already in it answers both without another paragraph.
 */
export function InstallAndSignInFigure(): React.ReactElement {
  return (
    <svg viewBox="0 0 320 150" className="editorial-figure__canvas" aria-hidden="true">
      <rect x="0.5" y="0.5" width="319" height="149" className="editorial-figure__frame" />

      <rect x="16" y="16" width="288" height="44" className="editorial-figure__panel" />
      <rect x="26" y="26" width="24" height="24" className="editorial-figure__accent" />
      <text x="58" y="42" className="editorial-figure__label">
        ClawAI Coding Agent
      </text>
      <rect x="228" y="26" width="66" height="24" className="editorial-figure__button" />
      <text x="243" y="42" className="editorial-figure__button-label">
        Install
      </text>

      <rect x="16" y="76" width="288" height="58" className="editorial-figure__panel" />
      <text x="26" y="96" className="editorial-figure__meta">
        Backend URL
      </text>
      <rect x="26" y="104" width="268" height="20" className="editorial-figure__field" />
      <text x="34" y="118" className="editorial-figure__typed">
        https://claw-ai.co
      </text>
    </svg>
  );
}
