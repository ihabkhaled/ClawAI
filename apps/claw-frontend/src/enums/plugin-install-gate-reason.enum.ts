/** Why the Install button is disabled. `None` means the user may install. */
export enum PluginInstallGateReason {
  None = 'none',
  GloballyDisabled = 'globallyDisabled',
  PlanOff = 'planOff',
  LimitReached = 'limitReached',
  AlreadyInstalled = 'alreadyInstalled',
}
