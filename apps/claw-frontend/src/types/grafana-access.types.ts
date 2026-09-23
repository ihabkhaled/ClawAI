/** The reply to POST /auth/grafana-access. The cookie itself is httpOnly and never visible here. */
export interface GrafanaAccessGrant {
  expiresAt: string;
}

/** The two things the hook does with the tab it opened. A `Window` satisfies it. */
export interface GrafanaTab {
  location: { href: string };
  close: () => void;
}

/** Opens an empty tab; returns null when the browser refused to open one. */
export type GrafanaTabOpener = () => GrafanaTab | null;

export interface UseOpenGrafanaResult {
  /** Only an ADMIN may open Grafana; the button is not rendered for anyone else. */
  canOpenGrafana: boolean;
  isOpening: boolean;
  openGrafana: () => void;
}
