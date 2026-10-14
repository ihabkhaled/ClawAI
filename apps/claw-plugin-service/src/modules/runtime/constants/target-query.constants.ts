export const INSTALL_TARGET_SELECT = {
  id: true,
  pluginId: true,
  status: true,
  settings: true,
  plugin: { select: { slug: true, status: true, globallyEnabled: true } },
  version: {
    select: {
      runtimeKind: true,
      manifest: true,
      tools: { select: { name: true, disabledByAdmin: true } },
    },
  },
  credential: { select: { kind: true, headerName: true, ciphertext: true } },
  consents: { select: { toolName: true, level: true } },
} as const;
