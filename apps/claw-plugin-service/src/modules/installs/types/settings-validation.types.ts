import type { SettingsIssue } from '../../../common/enums/settings-issue.enum';

export type SettingsViolation = { path: string; issue: SettingsIssue };

export type SettingsRecord = Record<string, unknown>;

/** What a schema says about one key of an object: its own rule and the catch-all for other keys. */
export type PropertyRules = { key: string; declared: unknown; additional: unknown };
