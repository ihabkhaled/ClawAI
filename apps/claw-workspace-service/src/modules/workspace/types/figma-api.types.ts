export type FigmaTeamProject = {
  id: string;
  name: string;
};

export type FigmaProjectsResponse = {
  name: string;
  projects: FigmaTeamProject[];
};

export type FigmaFile = {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
};

export type FigmaProjectFilesResponse = {
  name: string;
  files: FigmaFile[];
};

export type FigmaFileDetailsResponse = {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document?: { id?: string };
  role?: string;
};

export type FigmaTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user_id?: string;
};

export type FigmaTeamResolutionMode = {
  teamId: string;
};

// v3 round 10 (2026-05-14) — Prompt 09: Figma design analysis pipeline.
// The raw Figma document tree is huge and recursive; FigmaDocumentNode
// models only the fields the analyzer reads. The analyzer walks this
// tree and flattens it into FigmaDesignAnalysis — a compact, AI-ready
// summary that a design-to-story AI action can turn into user stories.

export type FigmaDocumentNode = {
  id: string;
  name: string;
  type: string;
  characters?: string; // present on TEXT nodes
  children?: FigmaDocumentNode[];
};

export type FigmaFileTreeResponse = {
  name: string;
  lastModified: string;
  version: string;
  document: FigmaDocumentNode;
  components?: Record<string, { name: string; description?: string }>;
};

export type FigmaDesignFrame = {
  pageName: string;
  frameName: string;
  // Distinct text strings found anywhere inside this frame, de-duped and
  // capped so the analysis stays compact.
  textSnippets: string[];
};

export type FigmaDesignAnalysis = {
  fileKey: string;
  fileName: string;
  version: string;
  pageCount: number;
  frameCount: number;
  componentCount: number;
  // Names of reusable components defined in the file.
  componentNames: string[];
  // Per-frame breakdown — the primary input for design-to-story.
  frames: FigmaDesignFrame[];
  // Truncation flags so the caller knows the summary is partial.
  truncated: boolean;
};
