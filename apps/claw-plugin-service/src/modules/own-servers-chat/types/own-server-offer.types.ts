import type { ResolvedTool, ResolveNotice } from '../../runtime/types/resolve.types';

/** What the mentioned own servers contribute to one resolve answer. */
export type OwnServerOffer = {
  tools: ResolvedTool[];
  lines: string[];
  notices: ResolveNotice[];
};

/** One mentioned own server, and the one tool picked when the user picked one. */
export type OwnServerMention = { serverId: string; toolName?: string | undefined };
