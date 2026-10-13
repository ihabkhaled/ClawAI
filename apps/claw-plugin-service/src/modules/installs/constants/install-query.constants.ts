export const INSTALL_INCLUDE = {
  plugin: true,
  version: { select: { id: true, version: true, manifest: true } },
  credential: { select: { kind: true, updatedAt: true } },
  consents: true,
} as const;

export const INSTALL_ENTRY_INCLUDE = {
  versions: { select: { id: true, version: true, manifest: true } },
} as const;
