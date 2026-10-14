/** One counted phrase in all six plural forms; each holds `{count}`. */
export type PluralForms = {
  zero: string;
  one: string;
  two: string;
  few: string;
  many: string;
  other: string;
};

/** What a language writes: only the forms it distinguishes, plus the general `other`. */
export type RawPluralForms = Partial<PluralForms> & { other: string };

/** Counted phrases, import error texts and admin audit labels added by the plugins QA fixes (plugin-qa-fixes-translations.ts). */
export type PluginQaFixesLocaleTranslation = {
  count: {
    items: PluralForms;
    files: PluralForms;
    tools: PluralForms;
    toolsOn: PluralForms;
    toolsSkipped: PluralForms;
    installs: PluralForms;
    summary: string;
  };
  errors: { contentInvalid: string; parseFailed: string; rateLimitedAt: string };
  audit: {
    actions: {
      catalogCreated: string;
      catalogUpdated: string;
      catalogEnabled: string;
      catalogDisabled: string;
      catalogDeleted: string;
      catalogHealthChecked: string;
      catalogSeeded: string;
      serverApproved: string;
      serverRejected: string;
      ruleAdded: string;
      ruleRemoved: string;
    };
    targets: { catalogEntry: string; mcpServer: string; hostRule: string };
  };
};

/** The same shape as written per language, before the missing plural forms are filled in. */
export type RawPluginQaFixesTranslation = Omit<PluginQaFixesLocaleTranslation, 'count'> & {
  count: {
    items: RawPluralForms;
    files: RawPluralForms;
    tools: RawPluralForms;
    toolsOn: RawPluralForms;
    toolsSkipped: RawPluralForms;
    installs: RawPluralForms;
    summary: string;
  };
};
