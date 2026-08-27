/**
 * Which illustration accompanies an install step.
 *
 * Keyed by figure rather than by array index so the pairing survives a step
 * being reordered or reworded, and so a step that gains no illustration is an
 * explicit absence rather than an off-by-one.
 */
export enum CodingAgentInstallFigure {
  EXTENSIONS_VIEW = 'EXTENSIONS_VIEW',
  SEARCH_RESULT = 'SEARCH_RESULT',
  INSTALL_AND_SIGN_IN = 'INSTALL_AND_SIGN_IN',
}
