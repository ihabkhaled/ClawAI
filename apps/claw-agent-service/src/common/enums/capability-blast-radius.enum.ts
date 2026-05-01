// Risk-scoring input — how much damage can this action do if it goes wrong?
// NONE          — pure read, no side effects
// SINGLE_RESOURCE — one file / one process / one tab
// MANY_RESOURCES  — many files / many processes
// USER_SCOPE      — affects user-account state (logout, lock screen)
// SYSTEM_SCOPE    — affects whole machine (shutdown, kernel-level)
// EXTERNAL        — network call, external account write
export enum CapabilityBlastRadius {
  NONE = 'NONE',
  SINGLE_RESOURCE = 'SINGLE_RESOURCE',
  MANY_RESOURCES = 'MANY_RESOURCES',
  USER_SCOPE = 'USER_SCOPE',
  SYSTEM_SCOPE = 'SYSTEM_SCOPE',
  EXTERNAL = 'EXTERNAL',
}
