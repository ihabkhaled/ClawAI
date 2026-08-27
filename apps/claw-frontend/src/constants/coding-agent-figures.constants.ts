import { CodingAgentInstallFigure } from '@/enums/coding-agent-install-figure.enum';

/**
 * The illustration for each install step, in step order.
 *
 * A reader following instructions for another program's interface needs to see
 * what they are looking for; prose alone makes them hunt. These are schematics
 * rather than screenshots on purpose — a screenshot of VS Code goes stale with
 * every theme and version, and a stale one actively misleads, while a diagram
 * of "a search box, a result, a button" stays true.
 */
export const CODING_AGENT_INSTALL_FIGURES: readonly CodingAgentInstallFigure[] = [
  CodingAgentInstallFigure.EXTENSIONS_VIEW,
  CodingAgentInstallFigure.SEARCH_RESULT,
  CodingAgentInstallFigure.INSTALL_AND_SIGN_IN,
];
