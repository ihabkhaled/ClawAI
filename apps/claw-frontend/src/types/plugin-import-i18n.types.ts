/** Import a plugin: source, preview review, components, warnings, imported list and errors (plugin-import-translations.ts). */
export type PluginImportLocaleTranslation = {
  nav: { import: string };
  description: string;
  source: {
    label: string;
    github: string;
    upload: string;
    githubLabel: string;
    githubHelp: string;
    uploadLabel: string;
    uploadHelp: string;
    preview: string;
    previewing: string;
  };
  marketplace: { title: string; description: string; choose: string; elsewhere: string };
  review: {
    title: string;
    source: string;
    commit: string;
    checksum: string;
    author: string;
    license: string;
    files: string;
    filesValue: string;
    risk: { low: string; medium: string; high: string };
    componentsTitle: string;
    noComponents: string;
    acknowledge: string;
    acknowledgeBody: string;
    install: string;
    installing: string;
    cancel: string;
  };
  support: { usable: string; storedInert: string; notSupported: string };
  kind: {
    skill: string;
    command: string;
    agent: string;
    hook: string;
    mcpServer: string;
    outputStyle: string;
  };
  reason: {
    hooks: string;
    stdio: string;
    sse: string;
    noSkillsStore: string;
    noChatUse: string;
    urlInvalid: string;
  };
  warning: {
    hooksNotRun: string;
    stdioNotRun: string;
    filesIgnored: string;
    noManifest: string;
    nameFromSource: string;
    duplicateComponentName: string;
    componentLimit: string;
  };
  imported: { title: string; empty: string; summary: string; remove: string };
  toast: { installed: string; removed: string };
  errors: {
    generic: string;
    sourceInvalid: string;
    sourceUnreachable: string;
    sourceNotFound: string;
    rateLimited: string;
    uploadMissing: string;
    uploadTooLarge: string;
    archiveUnsupported: string;
    archiveCorrupt: string;
    archiveTooBig: string;
    archiveEncrypted: string;
    pathUnsafe: string;
    symlink: string;
    duplicateEntry: string;
    nonUtf8: string;
    manifestInvalid: string;
    noPlugin: string;
    draftExpired: string;
    checksum: string;
    duplicatePlugin: string;
    quota: string;
    planDisabled: string;
  };
};
