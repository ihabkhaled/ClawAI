import type { RiskLevel } from '../../../common/enums/risk-level.enum';

/** One tool offered to the model, already named `plugin_<slug>_<tool>`. */
export type ResolvedTool = {
  nativeName: string;
  installId: string;
  pluginSlug: string;
  toolName: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  riskLevel: RiskLevel;
};

export type ResolveNotice = { code: string; pluginSlug?: string };

export type ResolveLimits = { maxRounds: number; maxCallsPerTurn: number };

/** The answer to POST /internal/plugins/resolve. */
export type ResolveResponse = {
  tools: ResolvedTool[];
  systemBlock: string;
  limits: ResolveLimits;
  notices: ResolveNotice[];
};

/** One `@mention` chip: an install, and the one tool picked when the user picked one. */
export type ResolveMention = { installId: string; toolName?: string | undefined };

/** What one mentioned plugin contributes: its tools and its line in the system block. */
export type ResolvedOffer = { tools: ResolvedTool[]; line: string };
